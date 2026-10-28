// Poseidon2 / Goldilocks reference and constants derived from Quantus-Network/quantus-miner.
// Apache-2.0; revision 8e2d27219c93567fca67bf049f52882f6c87df35. See assets/quantus/LICENSE.

const PRIME = 0xffffffff00000001n;
export const U512_MAX = (1n << 512n) - 1n;

export function hexBytes(hex, length) {
    const value = String(hex).replace(/^0x/, '');
    if (!new RegExp(`^[0-9a-fA-F]{${length * 2}}$`).test(value)) {
        throw new Error('Invalid Quantus hash or nonce');
    }
    return Uint8Array.from(value.match(/../g), byte => Number.parseInt(byte, 16));
}

export function littleEndian(value, length) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++, value >>= 8n) bytes[i] = Number(value & 255n);
    return bytes;
}

export function difficultyTarget(difficulty) {
    if (typeof difficulty === 'number' && !Number.isSafeInteger(difficulty)) {
        throw new Error('Pool difficulty must be an exact integer');
    }
    const value = BigInt(difficulty);
    if (value < 1n || value > U512_MAX) throw new Error('Invalid pool difficulty');
    return U512_MAX / value;
}

function external(state) {
    for (let i = 0; i < 12; i += 4) {
        const [a, b, c, d] = state.slice(i, i + 4);
        const sum = a + b + c + d;
        state.splice(i, 4,
            (sum + b + a + b) % PRIME,
            (sum + b + 2n * c) % PRIME,
            (sum + d + c + d) % PRIME,
            (sum + d + 2n * a) % PRIME);
    }
    const sums = [0n, 0n, 0n, 0n];
    for (let i = 0; i < 12; i++) sums[i % 4] += state[i];
    for (let i = 0; i < 12; i++) state[i] = (state[i] + sums[i % 4]) % PRIME;
}

function sbox(value) {
    const x = value % PRIME;
    const square = x * x % PRIME;
    return square * square % PRIME * square % PRIME * x % PRIME;
}

function permute(state) {
    external(state);
    for (const constants of [INITIAL, INTERNAL, TERMINAL]) {
        if (constants === INTERNAL) {
            for (const constant of constants) {
                state[0] = sbox(state[0] + constant);
                const sum = state.reduce((a, b) => a + b, 0n);
                for (let i = 0; i < 12; i++) state[i] = (state[i] * DIAGONAL[i] + sum) % PRIME;
            }
        } else {
            for (let round = 0; round < 4; round++) {
                for (let i = 0; i < 12; i++) state[i] = sbox(state[i] + constants[round * 12 + i]);
                external(state);
            }
        }
    }
}

function absorb(state, bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < 8; i++) state[i] = (state[i] + BigInt(view.getUint32(i * 4, true))) % PRIME;
    permute(state);
}

function initialState(header, nonceHigh) {
    const state = Array(12).fill(0n);
    absorb(state, hexBytes(header, 32));
    absorb(state, nonceHigh);
    return state;
}

export function miningMidstate(header, nonce) {
    const state = initialState(header, hexBytes(nonce, 64).subarray(0, 32));
    const bytes = new Uint8Array(96);
    state.forEach((value, i) => bytes.set(littleEndian(value, 8), i * 8));
    return bytes;
}

// Independently verify GPU results before submitting a share to the pool.
export function nonceHash(header, nonce) {
    const bytes = hexBytes(nonce, 64);
    const state = initialState(header, bytes.subarray(0, 32));
    absorb(state, bytes.subarray(32));
    state[0] = (state[0] + 1n) % PRIME;
    state[1] = (state[1] + 1n) % PRIME;
    permute(state);
    const output = new Uint8Array(64);
    for (let half = 0; half < 2; half++) {
        for (let i = 0; i < 4; i++) output.set(littleEndian(state[i], 8), half * 32 + i * 8);
        if (half === 0) permute(state);
    }
    return Array.from(output, byte => byte.toString(16).padStart(2, '0')).join('');
}

const INTERNAL = [
    10950354654605269091n, 15119356940911695088n, 7612059357007237638n, 12236395664799796772n,
    2977570947024676277n, 6373970340753430342n, 9946283046412846796n, 4463022581802230821n,
    4150295645638148407n, 4490915162115027274n, 10829504123483496140n, 4597224039659100030n,
    10266435449820638573n, 9552757317149730134n, 17182064290885366998n, 2165695174462817354n,
    1097317823465564870n, 1947274085218180819n, 1813898247148918694n, 17786016722733367904n,
    4522584789973874566n, 6140884543838897619n,
];

const INITIAL = [
    13835875475997267463n, 13593300247443167546n, 8256098654959761401n, 16497527840820049068n,
    15411522637299147849n, 17020150177669596865n, 5219051110225758042n, 7790297870083302641n,
    16425486905783891643n, 15683309641931586601n, 16544887301834777006n, 3043822364766212060n,
    12511554865575947557n, 2815218757487154454n, 5397191216188696727n, 6263167237941024378n,
    2268298353185649950n, 3891183183650783080n, 16503280268681069520n, 18218637884622147757n,
    14810472806729743006n, 4746652143794040382n, 17167206695294637949n, 15175925601089995781n,
    9033104775021388674n, 9921017235607945260n, 12923798861715797527n, 15786281414702354803n,
    8714540470225280152n, 2761431909488453770n, 11068269652872909615n, 7255476598362472915n,
    17152841886271966136n, 5752572615743285230n, 6296806204286062663n, 17660184115874751421n,
    2188234123236287607n, 7071885762696490733n, 12261132718627234478n, 7190250995558642684n,
    4297991823969990112n, 2588908926796910813n, 12309391821249485402n, 16850936440481388618n,
    14821697447947797068n, 10388886288248231395n, 6579267572940231471n, 16030945643832113911n,
];

const TERMINAL = [
    8895389066387410030n, 1460701038096849270n, 9232424000661355656n, 7869694012000561090n,
    11674967405510647539n, 17791439039604636207n, 3816678204163591524n, 12701925137758912458n,
    7268169701857820838n, 1067589902488001943n, 2070308862709674891n, 7382496027314534074n,
    6944427652715851265n, 4599841608850341455n, 16721906878468876749n, 17856999528157411150n,
    17553134374929059977n, 7890458318273453558n, 17906430202258692747n, 6331829681132802170n,
    1650501125073619501n, 2395319349875521589n, 12750456425164666614n, 15628562918670685207n,
    16472031182362063631n, 8519479891090086696n, 650980590610947853n, 8543868547028952308n,
    1027758676635423666n, 10647516517072103279n, 11022005145419959786n, 16418258577134197184n,
    2230831754333088463n, 802979627989531812n, 7080627001952875303n, 6853960081492534406n,
    18303760418668938283n, 8239306592877361155n, 16622244490604654200n, 6274074331584152849n,
    17886681876111343804n, 3231554205214632021n, 9020704674996646513n, 9632659917939292177n,
    5954679916794327224n, 5786083536133615252n, 13610804294834768633n, 16186843687143828937n,
];

const DIAGONAL = [
    14102670999874605824n, 15585654191999307702n, 940187017142450255n, 8747386241522630711n,
    6750641561540124747n, 7440998025584530007n, 6136358134615751536n, 12413576830284969611n,
    11675438539028694709n, 17580553691069642926n, 892707462476851331n, 15167485180850043744n,
];
