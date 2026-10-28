import test from 'node:test';
import assert from 'node:assert/strict';
import { difficultyTarget, hexBytes, littleEndian, miningMidstate, nonceHash, U512_MAX } from '../quantus-pow.js';

// Golden vectors: Quantus-Network/quantus-miner, Apache-2.0.
// crates/pow-core/src/lib.rs @ 8e2d27219c93567fca67bf049f52882f6c87df35.
// License: ../assets/quantus/LICENSE.
const vectors = [
    {
        "header": "0000000000000000000000000000000000000000000000000000000000000000",
        "nonce": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        "hash": "8e64e3d8e0f38f882e8501f9e525df0a95d2e91e9cfc32c9248d756fb07780e2f8fdca2c5a54441e6fcd8d774a5f6aae72f36d1c76bc19f691a0d4f6c607e8cc",
        "midstate": [
            "9675653081381010637",
            "9335018188218393413",
            "5280293042594064572",
            "14152867750099587083",
            "16447743628489887879",
            "7151515794762468710",
            "5372908582394033882",
            "1815014320013132914",
            "2323062730974096296",
            "17247551699331051634",
            "13937018576719839235",
            "15527376511202479903"
        ]
    },
    {
        "header": "0101010101010101010101010101010101010101010101010101010101010101",
        "nonce": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001",
        "hash": "e4ef79db80b642a093d7e38e6a6daac7ec1cca7293ddbe3710b4e6781be4add0b93f7e3440626df5bb23b757436787ba8d3fd0a2652e387f8af5bd8a5cc2ce2f",
        "midstate": [
            "8686589650160737413",
            "15916239124384226131",
            "3954406874931052346",
            "9251668920404539455",
            "14658498809724319230",
            "9060707124040943287",
            "10799311398419063230",
            "12800224456047281789",
            "9880528157873409815",
            "5468723469972086922",
            "16794273195342525535",
            "18081293930946429169"
        ]
    },
    {
        "header": "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        "nonce": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001234567890abcdef",
        "hash": "7f6c410ce62e7fc54811ad3b8b92664ac0f8b1d2cd6eb163129251146e7ee34d27794aaae1b31eaaeb98ab835bae6a2b9ac4ad6f08c95903e1423f0b865816ff",
        "midstate": [
            "17797245558702595096",
            "18269082720587651582",
            "2868692063295739002",
            "7660723261967270867",
            "6888521519984521414",
            "15482899420038118958",
            "17578118605395805478",
            "13891639344586366422",
            "14784518158474221790",
            "11746492547702718476",
            "4445692642546629322",
            "13571024997402773054"
        ]
    },
    {
        "header": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "nonce": "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffff",
        "hash": "822f70999ee517f610b51bbb79ba88bfbb19cb77b316df25d8aeb4c2682673555e9fc6a588ee96dcce4ff0d2b8d97f4aa89d0f46c97f9027b386d42b14be5100",
        "midstate": [
            "15131694365240488969",
            "1055039623882477263",
            "4285772340955221561",
            "4874479353432953266",
            "16996596920568654016",
            "13069884258668016337",
            "1552469848025384492",
            "3646387140219467202",
            "15088041187246293522",
            "3283818149711919997",
            "7068900784405327697",
            "9232424056723967763"
        ]
    },
    {
        "header": "0707070707070707070707070707070707070707070707070707070707070707",
        "nonce": "00000000000000000000000000000000000000000deadbeefcafe000000000000000000000000000000000000000000000000000000000001234567890abcdef",
        "hash": "eab81cdb33db293aef7e1f10f85cb08d17bc197c284d46a25d9dc57cdb7ba878adf3f5c354318121876795aab08c0941afda21d835383faa2f139c26be31a30a",
        "midstate": [
            "4722116125720074765",
            "13254512541036499522",
            "3493364794996903038",
            "13204946361828408977",
            "867676470701228417",
            "15586359158060740846",
            "9869865036921479518",
            "9861278979229035810",
            "10102772849360062939",
            "869142873470420562",
            "8815708340632257896",
            "11156548327112059580"
        ]
    }
];

for (const [index, vector] of vectors.entries()) {
    test(`official QPoW hash vector ${index}`, () => {
        assert.equal(nonceHash(vector.header, vector.nonce), vector.hash);
    });
    if (vector.midstate) test(`official QPoW midstate vector ${index}`, () => {
        const state = miningMidstate(vector.header, vector.nonce);
        const view = new DataView(state.buffer);
        assert.deepEqual(Array.from({ length: 12 }, (_, i) => view.getBigUint64(i * 8, true).toString()), vector.midstate.map(String));
    });
}

test('512-bit target division stays exact and invalid difficulty fails closed', () => {
    assert.equal(difficultyTarget('1'), U512_MAX);
    assert.equal(difficultyTarget('18446744073709551617'), U512_MAX / 18446744073709551617n);
    for (const input of ['0', '-1', '1.2', 'NaN', 'Infinity', (U512_MAX + 1n).toString(), Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => difficultyTarget(input));
    }
});

test('nonce buffers preserve little endian words and reject malformed input', () => {
    assert.deepEqual(Array.from(littleEndian(0x0123456789abcdefn, 8)), [239, 205, 171, 137, 103, 69, 35, 1]);
    assert.deepEqual(Array.from(hexBytes('0x01020304', 4)), [1, 2, 3, 4]);
    for (const input of ['00', 'g'.repeat(64), '0'.repeat(63)]) assert.throws(() => hexBytes(input, 32));
});
