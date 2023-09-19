use crate::DefaultCircuit;
use halo2_proofs::halo2curves::pasta::Fp;
use halo2_proofs::circuit::Value;
use halo2_proofs::poly::kzg::commitment::ParamsKZG;
use halo2_proofs::SerdeFormat;
use halo2_proofs::plonk::{keygen_pk, keygen_vk};
use std::{fs, path, marker::PhantomData};

// pub fn get_params() -> ParamsKZG<Fp> {
//     let filepath = fs::canonicalize(path::PathBuf::from("./kzg_bn254_7.srs")).unwrap();
//     let reader = fs::read(filepath).unwrap();
//     ParamsKZG::read_custom(&mut reader.as_slice(), SerdeFormat::RawBytesUnchecked).unwrap()
// }

// pub fn vkey() {
//     // circuit without witnesses
//     let empty_circuit = DefaultCircuit {
//         message: Value::unknown(),
//         _spec: PhantomData,
//     };

//     // get params
//     let params = get_params();

//     // return verifying key
//     let vk = keygen_vk(&params, &empty_circuit).unwrap();
// }
