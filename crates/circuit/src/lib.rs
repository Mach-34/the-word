use crate::circuit::{HashCircuit, HashSpec};

pub mod circuit;
pub mod utils;

// expected circuit size - 2^(k-1) < # of rows in circuit < 2^k
pub const K: u32 = 7;

pub type DefaultHashSpec = HashSpec<3, 2>;

pub type DefaultCircuit = HashCircuit<DefaultHashSpec, 3, 2, 2>;