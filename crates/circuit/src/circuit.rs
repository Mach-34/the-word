use halo2_gadgets::poseidon::{
    primitives::{ConstantLength, Spec, generate_constants, Mds},
    Hash, Pow5Chip, Pow5Config,
};
use halo2_proofs::{
    circuit::{Layouter, SimpleFloorPlanner, Value},
    halo2curves::bn256::Fr,
    arithmetic::Field,
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance},
};
use std::marker::PhantomData;

/// POSEIDON BENCH CIRCUIT ///
// https://github.com/zcash/halo2/blob/main/halo2_gadgets/benches/poseidon.rs#L24C1-L112


#[derive(Clone, Copy)]
pub struct HashCircuit<S, const WIDTH: usize, const RATE: usize, const L: usize>
where
    S: Spec<Fr, WIDTH, RATE> + Clone + Copy,
{
    pub message: Value<[Fr; L]>,
    pub _spec: PhantomData<S>,
}

#[derive(Debug, Clone)]
pub struct HashConfig<const WIDTH: usize, const RATE: usize, const L: usize> {
    input: [Column<Advice>; L],
    expected: Column<Instance>,
    poseidon_config: Pow5Config<Fr, WIDTH, RATE>,
}

impl<S, const WIDTH: usize, const RATE: usize, const L: usize> Circuit<Fr>
    for HashCircuit<S, WIDTH, RATE, L>
where
    S: Spec<Fr, WIDTH, RATE> + Copy + Clone,
{
    type Config = HashConfig<WIDTH, RATE, L>;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            message: Value::unknown(),
            _spec: PhantomData,
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fr>) -> Self::Config {
        let state = (0..WIDTH).map(|_| meta.advice_column()).collect::<Vec<_>>();
        let expected = meta.instance_column();
        meta.enable_equality(expected);
        let partial_sbox = meta.advice_column();

        let rc_a = (0..WIDTH).map(|_| meta.fixed_column()).collect::<Vec<_>>();
        let rc_b = (0..WIDTH).map(|_| meta.fixed_column()).collect::<Vec<_>>();

        meta.enable_constant(rc_b[0]);

        Self::Config {
            input: state[..RATE].try_into().unwrap(),
            expected,
            poseidon_config: Pow5Chip::configure::<S>(
                meta,
                state.try_into().unwrap(),
                partial_sbox,
                rc_a.try_into().unwrap(),
                rc_b.try_into().unwrap(),
            ),
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fr>,
    ) -> Result<(), Error> {
        let chip = Pow5Chip::construct(config.poseidon_config.clone());

        let message = layouter.assign_region(
            || "load message",
            |mut region| {
                let message_word = |i: usize| {
                    let value = self.message.map(|message_vals| message_vals[i]);
                    region.assign_advice(
                        || format!("load message_{}", i),
                        config.input[i],
                        0,
                        || value,
                    )
                };

                let message: Result<Vec<_>, Error> = (0..L).map(message_word).collect();
                Ok(message?.try_into().unwrap())
            },
        )?;

        let hasher = Hash::<_, _, S, ConstantLength<L>, WIDTH, RATE>::init(
            chip,
            layouter.namespace(|| "init"),
        )?;
        let output = hasher.hash(layouter.namespace(|| "hash"), message)?;

        layouter.constrain_instance(output.cell(), config.expected, 0)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct HashSpec<const WIDTH: usize, const RATE: usize>;

impl<const WIDTH: usize, const RATE: usize> Spec<Fr, WIDTH, RATE> for HashSpec<WIDTH, RATE> {
    fn full_rounds() -> usize {
        8
    }

    fn partial_rounds() -> usize {
        56
    }

    fn sbox(val: Fr) -> Fr {
        val.pow_vartime([5])
    }

    fn secure_mds() -> usize {
        0
    }

    fn constants() -> (Vec<[Fr; WIDTH]>, Mds<Fr, WIDTH>, Mds<Fr, WIDTH>) {
        generate_constants::<_, Self, WIDTH, RATE>()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{DefaultCircuit, K, utils};
    use halo2_gadgets::poseidon::primitives::{ConstantLength, Hash as Poseidon, P128Pow5T3};
    use halo2_proofs::{dev::MockProver, halo2curves::ff::PrimeField};

    #[test]
    fn test_mock() {
        let word: &str = "This is the title of a song";
        let word_bytes = word.as_bytes();
        let mut word_felt_bytes : [u8; 32] = [0; 32];
        word_felt_bytes[..word_bytes.len()].copy_from_slice(word_bytes);
        let value = Fr::from_repr(word_felt_bytes).unwrap();

        // compute expected output
        let expected_hash = Poseidon::<_, P128Pow5T3, ConstantLength<2>, 3, 2>::init()
            .hash([value.clone(), value.clone()]);

        // mock prove
        let circuit = DefaultCircuit {
            message: Value::known([value.clone(), value]),
            _spec: PhantomData,
        };

        let prover = MockProver::run(K, &circuit, vec![vec![expected_hash]]).unwrap();
        assert_eq!(prover.verify(), Ok(()));
    }

    #[test]
    fn test_real() {
        
    }

}
