use crate::cli::nextclade_cli::NextcladeRunArgs;
use crate::cli::nextclade_dataset_get::{dataset_file_http_get, nextclade_dataset_http_get, DatasetHttpGetParams};
use crate::dataset::dataset::Dataset;
use crate::io::http_client::{HttpClient, ProxyConfig};
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::LevelFilter;
use nextclade::analyze::pcr_primers::PcrPrimer;
use nextclade::analyze::virus_properties::VirusProperties;
use nextclade::io::fasta::{read_one_fasta, read_one_fasta_str, FastaRecord};
use nextclade::io::fs::absolute_path;
use nextclade::io::gene_map::{filter_gene_map, GeneMap};
use nextclade::io::gff3::{read_gff3_file, read_gff3_str};
use nextclade::make_error;
use nextclade::qc::qc_config::QcConfig;
use nextclade::tree::tree::AuspiceTree;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use std::fs;
use std::fs::File;
use std::io::{BufReader, Read, Seek};
use std::path::Path;
use std::str::FromStr;
use zip::ZipArchive;

pub fn dataset_dir_download(http: &mut HttpClient, dataset: &Dataset, output_dir: &Path) -> Result<(), Report> {
  let output_dir = &absolute_path(output_dir)?;
  fs::create_dir_all(output_dir).wrap_err_with(|| format!("When creating directory '{output_dir:#?}'"))?;

  dataset
    .files
    .par_iter()
    .map(|(filename, url)| -> Result<(), Report> {
      let output_file_path = output_dir.join(filename);
      let content = http.get(url)?;
      fs::write(output_file_path, content)?;
      Ok(())
    })
    .collect::<Result<(), Report>>()
    .wrap_err_with(|| format!("When downloading dataset {dataset:#?}"))
}

pub fn dataset_zip_download(http: &mut HttpClient, dataset: &Dataset, output_file_path: &Path) -> Result<(), Report> {
  if let Some(parent_dir) = output_file_path.parent() {
    let parent_dir = &absolute_path(parent_dir)?;
    fs::create_dir_all(parent_dir)
      .wrap_err_with(|| format!("When creating parent directory '{parent_dir:#?}' for file '{output_file_path:#?}'"))?;
  }

  let content = http.get(&dataset.zip_bundle)?;
  fs::write(output_file_path, content)
    .wrap_err_with(|| format!("When writing downloaded dataset zip file to {output_file_path:#?}"))
}

pub struct DatasetFiles {
  pub ref_record: FastaRecord,
  pub virus_properties: VirusProperties,
  pub tree: AuspiceTree,
  pub gene_map: GeneMap,
  pub qc_config: QcConfig,
  pub primers: Vec<PcrPrimer>,
}

pub fn zip_read_str<R: Read + Seek>(zip: &mut ZipArchive<R>, name: &str) -> Result<String, Report> {
  let mut s = String::new();
  let bytes = zip.by_name(name)?.read_to_string(&mut s);
  Ok(s)
}

pub fn dataset_zip_load(
  run_args: &NextcladeRunArgs,
  dataset_zip: impl AsRef<Path>,
  genes: &Option<Vec<String>>,
) -> Result<DatasetFiles, Report> {
  let file = File::open(dataset_zip)?;
  let buf_file = BufReader::new(file);
  let mut zip = ZipArchive::new(buf_file)?;

  let ref_record = run_args.inputs.input_ref.as_ref().map_or_else(
    || read_one_fasta_str(&zip_read_str(&mut zip, "reference.fasta")?),
    read_one_fasta,
  )?;

  let tree = run_args.inputs.input_tree.as_ref().map_or_else(
    || AuspiceTree::from_str(&zip_read_str(&mut zip, "tree.json")?),
    AuspiceTree::from_path,
  )?;

  let qc_config = run_args.inputs.input_qc_config.as_ref().map_or_else(
    || QcConfig::from_str(&zip_read_str(&mut zip, "qc.json")?),
    QcConfig::from_path,
  )?;

  let virus_properties = run_args.inputs.input_virus_properties.as_ref().map_or_else(
    || VirusProperties::from_str(&zip_read_str(&mut zip, "virus_properties.json")?),
    VirusProperties::from_path,
  )?;

  let primers = run_args.inputs.input_pcr_primers.as_ref().map_or_else(
    || PcrPrimer::from_str(&zip_read_str(&mut zip, "primers.csv")?, &ref_record.seq),
    |input_pcr_primers| PcrPrimer::from_path(input_pcr_primers, &ref_record.seq),
  )?;

  let gene_map = run_args.inputs.input_gene_map.as_ref().map_or_else(
    || filter_gene_map(Some(read_gff3_str(&zip_read_str(&mut zip, "genemap.gff")?)?), genes),
    |input_gene_map| filter_gene_map(Some(read_gff3_file(&input_gene_map)?), genes),
  )?;

  Ok(DatasetFiles {
    ref_record,
    virus_properties,
    tree,
    gene_map,
    qc_config,
    primers,
  })
}

#[rustfmt::skip]
pub fn dataset_dir_load(
  run_args: NextcladeRunArgs,
  dataset_dir: impl AsRef<Path>,
  genes: &Option<Vec<String>>,
) -> Result<DatasetFiles, Report> {
  let input_dataset = dataset_dir.as_ref();
  dataset_load_files(DatasetFilePaths {
    input_ref: &run_args.inputs.input_ref.unwrap_or_else(|| input_dataset.join("reference.fasta")),
    input_tree: &run_args.inputs.input_tree.unwrap_or_else(|| input_dataset.join("tree.json")),
    input_qc_config: &run_args.inputs.input_qc_config.unwrap_or_else(|| input_dataset.join("qc.json")),
    input_virus_properties: &run_args.inputs.input_virus_properties.unwrap_or_else(|| input_dataset.join("virus_properties.json")),
    input_pcr_primers: &run_args.inputs.input_pcr_primers.unwrap_or_else(|| input_dataset.join("primers.csv")),
    input_gene_map: &run_args.inputs.input_gene_map.unwrap_or_else(|| input_dataset.join("genemap.gff")),
  }, genes)
}

pub fn dataset_individual_files_load(
  run_args: &NextcladeRunArgs,
  genes: &Option<Vec<String>>,
) -> Result<DatasetFiles, Report> {
  #[rustfmt::skip]
  let required_args = &[
    (String::from("--input-ref"), &run_args.inputs.input_ref),
    (String::from("--input-tree"), &run_args.inputs.input_tree),
    (String::from("--input-gene-map"), &run_args.inputs.input_gene_map),
    (String::from("--input-qc-config"), &run_args.inputs.input_qc_config),
    (String::from("--input-pcr-primers"), &run_args.inputs.input_pcr_primers),
    (String::from("--input-virus-properties"), &run_args.inputs.input_virus_properties),
  ];

  #[allow(clippy::single_match_else)]
  match required_args {
    #[rustfmt::skip]
    [
      (_, Some(input_ref)),
      (_, Some(input_tree)),
      (_, Some(input_gene_map)),
      (_, Some(input_qc_config)),
      (_, Some(input_pcr_primers)),
      (_, Some(input_virus_properties)),
    ] => {
      dataset_load_files(DatasetFilePaths {
        input_ref,
        input_tree,
        input_qc_config,
        input_virus_properties,
        input_pcr_primers,
        input_gene_map,
      }, genes)
    },
    _ => {
      let missing_args = required_args
        .iter()
        .filter_map(|(key, val)| match val {
          None => Some(key),
          Some(_) => None,
        })
        .cloned()
        .join("  \n");

      make_error!("When `--input-dataset` is not specified, the following arguments are required:\n{missing_args}")
    }
  }
}

pub struct DatasetFilePaths<'a> {
  input_ref: &'a Path,
  input_tree: &'a Path,
  input_qc_config: &'a Path,
  input_virus_properties: &'a Path,
  input_pcr_primers: &'a Path,
  input_gene_map: &'a Path,
}

pub fn dataset_load_files(
  DatasetFilePaths {
    input_ref,
    input_tree,
    input_qc_config,
    input_virus_properties,
    input_pcr_primers,
    input_gene_map,
  }: DatasetFilePaths,
  genes: &Option<Vec<String>>,
) -> Result<DatasetFiles, Report> {
  let ref_record = read_one_fasta(input_ref)?;
  let primers = PcrPrimer::from_path(input_pcr_primers, &ref_record.seq)?;

  Ok(DatasetFiles {
    ref_record,
    virus_properties: VirusProperties::from_path(input_virus_properties)?,
    gene_map: filter_gene_map(Some(read_gff3_file(&input_gene_map)?), genes)?,
    tree: AuspiceTree::from_path(input_tree)?,
    qc_config: QcConfig::from_path(input_qc_config)?,
    primers,
  })
}

pub fn dataset_str_download_and_load(
  run_args: &NextcladeRunArgs,
  dataset_name: &str,
  genes: &Option<Vec<String>>,
) -> Result<DatasetFiles, Report> {
  let verbose = log::max_level() > LevelFilter::Info;
  let mut http = HttpClient::new(&run_args.inputs.server, &ProxyConfig::default(), verbose)?;

  let name = run_args
    .inputs
    .dataset_name
    .as_ref()
    .expect("Dataset name is expected, but got 'None'");

  let dataset = nextclade_dataset_http_get(
    &mut http,
    DatasetHttpGetParams {
      name,
      reference: "default",
      tag: "latest",
    },
    &[],
  )?;

  let ref_record = run_args.inputs.input_ref.as_ref().map_or_else(
    || read_one_fasta_str(&dataset_file_http_get(&mut http, &dataset, "reference.fasta")?),
    read_one_fasta,
  )?;

  let tree = run_args.inputs.input_tree.as_ref().map_or_else(
    || AuspiceTree::from_str(&dataset_file_http_get(&mut http, &dataset, "tree.json")?),
    AuspiceTree::from_path,
  )?;

  let qc_config = run_args.inputs.input_qc_config.as_ref().map_or_else(
    || QcConfig::from_str(&dataset_file_http_get(&mut http, &dataset, "qc.json")?),
    QcConfig::from_path,
  )?;

  let virus_properties = run_args.inputs.input_virus_properties.as_ref().map_or_else(
    || VirusProperties::from_str(&dataset_file_http_get(&mut http, &dataset, "virus_properties.json")?),
    VirusProperties::from_path,
  )?;

  let primers = run_args.inputs.input_pcr_primers.as_ref().map_or_else(
    || {
      PcrPrimer::from_str(
        &dataset_file_http_get(&mut http, &dataset, "primers.csv")?,
        &ref_record.seq,
      )
    },
    |input_pcr_primers| PcrPrimer::from_path(input_pcr_primers, &ref_record.seq),
  )?;

  let gene_map = run_args.inputs.input_gene_map.as_ref().map_or_else(
    || {
      filter_gene_map(
        Some(read_gff3_str(&dataset_file_http_get(
          &mut http,
          &dataset,
          "genemap.gff",
        )?)?),
        genes,
      )
    },
    |input_gene_map| filter_gene_map(Some(read_gff3_file(&input_gene_map)?), genes),
  )?;

  Ok(DatasetFiles {
    ref_record,
    virus_properties,
    tree,
    gene_map,
    qc_config,
    primers,
  })
}
