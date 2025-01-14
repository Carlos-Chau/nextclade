# Terminology

<!-- TODO: this section needs to be extended  -->

The terminology in bioinformatics is often ambiguous, with some terms not being defined well and some terms having different meaning, depending on context and research area.

In order to improve understanding of this documentation and of the source code of the project, in this section we try to summarize the terminology used by Nextclade, including possible synonyms. This terminology is not perfect or complete, and some of the definitions are purposefully simplified, to narrow down the scope to the topics relevant for the project.

For clarity, when possible, please use this vocabulary when communicating with Nextclade team.

We will be grateful for contributions to this section.

### Reference sequence

Synonyms: [**Root sequence**](#reference-sequence)

The sequence against which the [Alignment](#alignment-process) and [Analysis](#analysis) are modelled.

Reference sequence is expected to be mostly complete (no or few unsequenced or missing regions) and unambiguous (no or few no ambiguous nucleotides) and is expected to correspond to the root node of the phylogenetic tree.

The quality of reference sequence is important for the quality of the analysis.

### Root sequence

Same as [**Reference sequence**](#reference-sequence).

The name originates from the [Root node](#root-node) of the [Reference tree (concept)](#reference-tree-concept).

### Query sequence

Synonyms:  **Query nucleotide sequence**

One of the input nucleotide sequences provided by the user. These are the sequences to be analysed.

### Reference nucleotide

A nucleotide (character) in the [**Reference sequence**](#reference-sequence).

### Query nucleotide

Synonyms: **Derived nucleotide**

A nucleotide (character) in the [**Query sequence**](#query-sequence).

### Gene

A nucleotide sequence fragment encoding a [Peptide](#peptide).

### Codon (concept)

Synonyms: **Triplet**

A set of 3 consecutive nucleotides, encoding 1 aminoacid.

### Codon (position)

Numeric index of the [Codon (concept)] in a [Gene](#gene).

### Peptide

Synonyms: **Aminoacid sequence**

Translated nucleotide sequence of a Gene. A sequence consisting of aminoacids.

### Query peptide

A [Peptide](#peptide) corresponding to one of the [Genes](#gene) in the [Query sequence](#query-sequence)

### Reference peptide

A [Peptide](#peptide) corresponding to one of the [Genes](#gene) in the [Reference sequence](#reference-sequence)

### Query aminoacid

Synonyms: **Derived aminoacid**

Aminoacid in the [Query peptide](#query-peptide)

### Reference aminoacid

Aminoacid in the [Query peptide](#query-peptide)

### Reference tree (concept)

Phylogenetic tree - the tree diagram showing evolutionary relationships. Every node corresponds to a particular sequence. This tree is to be used as a source of clade annotations and as a target for phylogenetic placement.

### Reference tree (file)

The file that encodes the **Reference (phylogenetic) tree (concept)**. Most often refers to the tree files in Auspice JSON v2 format.

### Reference node

(not the same as [Root node](#root-node)

The node of the original reference tree.

Before [Plylogenetic placement](#phylogenetic-placement) all nodes of the tree are the reference nodes (there are no before [New nodes](#new-node) yet).

### Root node

Root node of the reference tree. This is the parent node for all other nodes.

The root node corresponds to the [Reference](#reference-sequence).

### New node

Node on the reference tree that corresponds to a particular [Query sequence](#query-sequence) placed onto the tree during the [Plylogenetic placement](#phylogenetic-placement).

### Gene map

(used interchangeably with **Genome annotation**)

A set of entries describing [Genes](#gene) for a particular virus. This includes names, nucleotide ranges of each gene.

### Alignment (process)

(used interchangeably with **Sequence alignment**, **Nucleotide alignment**, **Peptide alignment** and **Aminoacid alignment**, depending on the surrounding context)

The process of arranging [Query sequence](#query-sequence) against [Reference sequence](#reference-sequence) (or [Query peptide](#query-peptide) against [Reference peptide](#reference-peptide)) to identify regions of similarity that may be a consequence of functional, structural, or evolutionary relationships between the sequences.

During alignment, the fragments of the query sequence are compared to the fragments of the reference sequence, the similarities are identified and the fragments are repositioned such that to increase similarity. The resulting [aligned sequences](#alignment-result) allow comparisons on nucleotide (or aminoacid) level and to perform further analysis for example deducing mutations and other features of practical interest).

(this definition is adapted with modifications from: [wikipedia: Sequence alignment](https://en.wikipedia.org/wiki/Sequence_alignment))

See [Algorithm: phylogenetic placement](algorithm#alignment) for more details.

### Alignment (result)

The [Query sequence](#query-sequence) (or [Query peptide](#query-peptide)) after the [Alignment (process)](#alignment-process).

### Alignment range

Numeric range of nucleotide positions signifying begin and end of the [aligned sequence](#alignment-result).

### Clade

A virus variant, typically one of a several co-circulating. in Nextstrain, clades are defined by their combination of signature mutations.

See also: [Wikipedia: Clade](https://en.wikipedia.org/wiki/Clade) 

### Phylogenetic placement

The process of adding [New nodes](#new-node) to the the [Reference](#reference-tree-concept) tree.

See [Algorithm: phylogenetic placement](algorithm#phylogenetic-placement) for more details.

### Analysis

The process of performing various steps within the Nextclade algorithm.

### Frame

Reading frame [...]

### Frame shift

[...]
