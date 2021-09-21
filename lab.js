// @ts-check
import { html, render } from 'https://unpkg.com/htm/preact/standalone.module.js'

let ready = false;
const paint = () => {
    if (!ready) return;
    render(html`<${App} />`, document.body)
};

const givens = [
    { input: `typeof []`, output: 'object' },
    { input: `typeof NaN`, output: 'number' },
    { input: `+0 === -0`, output: true },
    { input: `Object.is(+0, -0)`, output: false },
    { input: `[-0].includes(+0)`, output: true},
    { input: `NaN === NaN`, output: false },
    { input: `Object.is(NaN, NaN)`, output: true },
    { input: `[NaN].includes(NaN)`, output: true },
    { input: `[0] === [0]`, output: false },
    { input: `#[0] === #[0]`, output: true },
];

/**
 * The state. Which selection has been made for the inputs that have a choice of outputs
 * @type {Map<string, string | boolean>}
 */
const selections = new Map();
selections.set = (input, output) => {
    const match = tweakables.find(v => v.input === input);
    if (match) {
        if (Array.isArray(match.output) && match.output.includes(output)) {
            if (selections.get(input) !== output) {
                Map.prototype.set.call(selections, input, output);
                if (ready) {
                    location.hash = '';
                }
                paint();
            }
        }
    }
    return selections;
};
/** @param concern {{input: string}} */
const get = (concern) => selections.get(concern.input);

const concerns = {
    withoutBox: html`<details><summary>⚠ complexity moved to ecosystem</summary>
        Using <a href="https://github.com/tc39/proposal-symbols-as-weakmap-keys">symbols-as-weakmap-keys</a>,
        symbols in Record and Tuples could still refer to objects/functions in a WeakMap.
        Code will need to ensure the nessesary code has access to these WeakMap side tables.
        APIs conventions will need to be established to distinguish when symbols are being used in this way.
        Care will need to be taken with the WeakMaps, if a Map is used by accident there is a risk of memory leaks.
        Unless direct access to the WeakMap is hidden behind a wrapper, other code could remove/replace the referenced
        object.
        <p>
            Box use-cases include:
            <ul>
                <li>Composite keys for Maps/Sets.</li>
                <li>
                    In React.js creating and passing groups of values, possibly functions,
                    around without triggering re-renders due to changing object identity
                </li>
            </ul>
        </p>
        </details>`,
    typeofPowerfulObjectIsNotObject: html`<details><summary>⚠ security risk</summary>
        Existing security sensitive code checks if a value has no-power by checking if it's typeof is not 'object' or 'function',
        and will assume values with other results are safe to pass-around without further inspection.
        These projects may not be updated before they start to interact with Records and Tuples.</details>`,
    validWeakValue: html`<details><summary>⚠ consistency change</summary>
        Current code can rely on the consistency that values that have typeof 'object' and are not null can be stored weakly.
        If R&T introduces values that have typeof 'object' but throw when placed in a WeakSet this consistency is no longer reliable.
        And code will need to be updated </details>`,
    weakSetLeak: html`<details><summary>⚠ memory leak</summary>
        If values are allowed in a WeakSet that are impossible to be garbage-collected this could create a silent memory leak</details>`,
    slotSensitiveTypeof: html`<details><summary>⚠ slot sensitive typeof</summary>
        If typeof a record or tuple changes depending on if there is a box transitively within its tree this makes typeof confusing.
        Code will have to rely on static methods like Record.isRecord instead.</details>`,
    confusingTypeof: html`<details><summary>⚠ problematic typeof</summary>
        If a Tuple without a Box in it's tree has typeof 'object', there is no value to be gained from a Tuple with a Box having typeof 'tuple',
        because if anything it is more like an object when it contains a Box.</details>`,
    objectWrappers: html`<details><summary>⚠ object wrappers</summary>
        Having Object wrappers for Record and Tuple  will adds a risk to avoid and confusion when using JS.</details>`,
    objectWrapperInConsistency: html`<details><summary>⚠ object wrapper consistency</summary>
        Usually values where their typeof is not 'object' or 'function' have Object wrapper versions of them.</details>`,
    noBoxesInWeakSets: html`<details><summary>⚠ performance</summary>
        Libraries may want to create values based on Records that contain boxes. For example, mapping over a record
        and mapping each Box to something else. If this work is expensive, it may be beneficial to memoize the work
        using a WeakMap. But this wouldn't be possible if Records with Boxes can't be WeakMaps keys.</details>`,
    unequalTupleNan: html`<details><summary>⚠ consistency change</summary>
        Currently the only value not equal to itself is NaN, and this can be used as a reliable check for NaN.
        If any record or tuple containing a NaN within its tree is also not equal to itself, then there would
        be an infinite number of values not equal to themselves.</details>`,
    noNegativeZero: html`<details><summary>⚠ no negative zero</summary>
        Negative zero can be stored in a standard Array. If negative zero was transformed into positive zero
        when stored in a tuple, then mapping arrays of numbers to and from tuples would not be isomorphic.</details>`,
    impossibleEqualityOfZeros: html`<details><summary>⚠ impossible equality</summary>
        If negative zero can not be stored in a Tuple (converted to +0). Then #[-0] cannot compare unequal to #[+0].</details>`,
    observableDifferentButIsEqual: html`<details><summary>⚠ Object.is semantics</summary>
        Putting aside that two NaNs can be observably different, by storing them in a TypedArray and reading the bits.
        If Object.is returns true for two values this means the two values are not observably different, this is useful for
        memoization techniques. For a pure function, if the inputs have not changed in an observable way then neither should
        the output. React.js for example uses Object.is for its change-detection.
        If two Tuples compare equal, but have observably different values (one has positive zero and the other has negative zero),
        then this changes the semantics of Object.is, and the use cases it can be applied to.
        </details>`,
    nanNotIsNan: html`<details><summary>⚠ Object.is NaN semantics</summary>
        if both 'Object.is(NaN, NaN)' and '#[NaN] === #[NaN]'' are true, there does not appear to be a reason for
        Object.is(#[NaN], #[NaN]) to not be true.</details>`,
    canNotAlwaysIntern: html`<details><summary>⚠ can not always intern</summary>
        Object interning is a technique used to reduce memory and speed up certain operations after the initial interning cost.
        If #[+0] equals #[-0] and storing negative zero in a tuple is preserved then records and tuple equality can not solely rely
        on interning.
        </details>`,
    zerosNotTripleEqual: html`<details><summary>⚠ Triple equality semantics</summary>
        As -0 === +0 on their own, it may surprise people that they are no longer treated as triple equal when compared
        via a record or tuple. This could lead to bugs.</details>`,
    storingPrimitiveInBox: html`<details><summary>⚠ storing primitives in a Box</summary>
        If primitives can be stored in a Box, then code checking if a Record/Tuple transitively contains an object can no
        longer be performed with a containsBoxes predicate. Instead the code will need to also check the contents of the boxes.</details>`,
    recordProxies: html`<details><summary>⚠ Record proxies</summary>
        It appears that a Record-Proxy would not be able to be much different from 'new Proxy(Object.freeze({...record}), handler)'.
        This is because if the Proxy still retained Record semantics, then equality checks would need to trigger the traps.
        Causing arbitrary JS to run during previously safe operations like '==='.
        This means that the returning proxy can not be transparent, and will instead be an object and not a record.
        It could be better to throw instead so this API space remains open for new ideas on how to achieve this in the future.</details>`,
    proxyThrowTypeofObject: html`<details><summary>⚠ proxy ergonomics</summary>
        Usually if something has typeof 'object' then it would be safe to create a proxy of it.
        But if records and tuples are typeof 'object' and throw when passed to the proxy constructor,
        this causes users to update their code to manually convert Records/Tuples
        into their frozen object counterparts before passing them to the proxy constructor.</details>`,
}

const typeofBox =  { input: `typeof Box`, output: ['box', 'object', 'undefined'], concern: (self) => {
    if (noBox()) {
        return concerns.withoutBox;
    }
    if (self !== 'object') {
        return concerns.typeofPowerfulObjectIsNotObject;
    }
}};

const noBox = () => get(typeofBox) === 'undefined' ? `typeof Box === 'undefined'` : false;

const typeofTuple = { input: `typeof #[]`, output: ['tuple', 'object'], concern: (self) => {
    if ((!noBox()) && self !== get(typeOfTupleWithBox)) {
        return concerns.slotSensitiveTypeof;
    }
}};

const typeOfTupleWithBox = { input: `typeof #[Box({})]`, output: ['tuple', 'object'], disabled: noBox, concern: (self) => {
    if (get(typeofTuple) === 'object' && self === 'tuple') {
        return concerns.confusingTypeof;
    }
    if (self !== 'object') {
        return concerns.typeofPowerfulObjectIsNotObject;
    }
}};

const storeNegativeZero = { input: `Object.is(#[-0].at(0), -0)`, output: [true, false], concern: (self) => {
    if (!self) {
        return concerns.noNegativeZero;
    }
}};

const tupleNaNAreTripleEqual = { input: `#[NaN] === #[NaN]`, output: [true, false], concern: (self) => {
    if (!self) {
        return concerns.unequalTupleNan;
    }
}};

/**
 * input: a JS snipped
 * output: a string if this is 'given', or an Array of design options
 * disabled: a non-pure function that returns a string if this options is not currently available
 * concern: a non-pure function that returns a string if there is a concern with the design
 */
const tweakables = [
    storeNegativeZero,
    { input: `#[+0] === #[-0]`, output: [true, false], concern: (self) => {
        if (self) {
            if (get(storeNegativeZero)) {
                return concerns.canNotAlwaysIntern;
            }
        }
        else {
            if (!get(storeNegativeZero)) {
                return concerns.impossibleEqualityOfZeros;
            }
            return concerns.zerosNotTripleEqual;
        }
    }},
    tupleNaNAreTripleEqual,
    { input: `Object.is(#[+0], #[-0])`, output: [false, true], concern: (self) => {
        if (self) {
            if (get(storeNegativeZero)) {
                return concerns.observableDifferentButIsEqual;
            }
        }
        else {
            if (!get(storeNegativeZero)) {
                return concerns.impossibleEqualityOfZeros;
            }
        }
    }},
    { input: `Object.is(#[NaN], #[NaN])`, output: [true, false], concern: (self) => {
        if (!self && get(tupleNaNAreTripleEqual)) {
            return concerns.nanNotIsNan;
        }
    }},
    typeofBox,
    typeofTuple,
    typeOfTupleWithBox,
    { input: `Box(42) // throws?`, output: [true, false], disabled: noBox, concern: (self) => {
        if (!self) {
            return concerns.storingPrimitiveInBox;
        }
    } },
    { input: `Object(#[]) === #[]`, output: [true, false], concern: (self) => {
        if (self) {
            if (get(typeofTuple) !== 'object') {
                return concerns.objectWrapperInConsistency;
            }
        }
        else {
            return concerns.objectWrappers;
        }
    }},
    { input: `new WeakSet().add(#[]) // throws?`, output: [true, false], concern: (self) => {
        if (self) {
            if (get(typeofBox) === 'object') {
                return concerns.validWeakValue;
            }
        }
        else {
            return concerns.weakSetLeak;
        }
    }},
    { input: `new WeakSet().add(#[Box({})]) // throws?`, output: [true, false], disabled: noBox, concern: (self) => {
        if (self) {
            return concerns.noBoxesInWeakSets;
        }
    }},
    { input: `new Proxy(#[]) // throws?`, output: [true, false], concern: (self) => {
        if (self) {
            if (get(typeofTuple) === 'object') {
                return concerns.proxyThrowTypeofObject;
            }
        }
        else {
            return concerns.recordProxies;
        }
    }},
    { input: `new Proxy(#[Box({})]) // throws?`, output: [true, false], disabled: noBox, concern: (self) => {
        if (self) {
            if (get(typeOfTupleWithBox) === 'object') {
                return concerns.proxyThrowTypeofObject;
            }
        }
        else {
            return concerns.recordProxies;
        }
    } },
];

const design = [ ...givens, ...tweakables ];

function shuffle() {
    let wasReady = ready;
    location.hash = '';
    ready = false;
    try {
        for (const {input, output} of tweakables) {
            Array.isArray(output) && selections.set(input, output[Math.floor(Math.random() * output.length)]);
        }
    } finally {
        ready = wasReady;
    }
    paint();
}

let urlLoadingIssues = [];

function attemptLoadFromURL() {
    urlLoadingIssues = [];
    try {
        const urlData = location.hash;
        if (!urlData) {
            shuffle();
            return;
        };
        const tweakableKeys = new Set(tweakables.map(t => t.input));
        for (const [key, value] of Object.entries(JSON.parse(decodeURI(urlData.slice(1))))) {
            if (! tweakableKeys.has(key)) {
                urlLoadingIssues.push(`Unknown item in url: '${key}'`);
            }
            selections.set(key, value);
            tweakableKeys.delete(key);
        }
        for (const unusedKey of tweakableKeys) {
            urlLoadingIssues.push(`'${unusedKey}' was not set by the URL`);
        }
    } catch (e) {
        console.error(e);
    }
}
attemptLoadFromURL();

// ------------------------------------------------------------------------------------------------

function App() {
    return html`
        <h1 class="text-center">
            Record and Tuple Laboratory 🔬
            <a href="https://github.com/acutmore/record-tuple-laboratory"><img src="./res/github.png" height="30" /></a>
        </h1>
        <p class="text-center">
            🏗 Work in progress - <a href="https://github.com/acutmore/record-tuple-laboratory/issues/new" target="_blank">raise issue</a>
        </p>
        ${urlLoadingIssues.length > 0 ? html`
            <ul class="text-center">
                ${urlLoadingIssues.map(issue => html`<li>${issue}</li>`)}
            </ul>
        ` : false}
        <table class="center">
            ${design.map(c => {
                const disabled = c.disabled?.() ?? false;
                const concerns = c.concern?.(get(c)) ?? false;
                const attrs = disabled ? { class: 'disabled', title: disabled } : {};
                return html`
                    <tr>
                        <td ...${attrs}><pre>${c.input}</pre></td>
                        <td><${Selection} ...${c} disabled=${disabled} /></td>
                        <td width=500em>${disabled
                                ? html`<details><summary>…</summary>${disabled}</details>`
                                : concerns ? concerns : ''}
                        </td>
                    </tr>
                `
            })}
        </table>
        <p class="text-center">
            <button onClick=${shuffle}>shuffle</button>
        </p>
        <div class="center" style=${{ width: '500px' }}>
            <div class="scrollable" style=${{ marginTop: '10px', float: 'left' }}><${JSONOutput} /></div>
            <div class="scrollable" style=${{ marginTop: '10px', float: 'left' }}><${JSONInput} /> </div>
        </div>
    `;
}

function Selection({input, output, disabled }) {
    if (Array.isArray(output)) {
        return html`
            <select onChange=${e => selections.set(input, JSON.parse(e.target.value))} disabled=${disabled} >
                ${output.map(o => html`<option selected=${selections.get(input) === o} value=${JSON.stringify(o)}>${JSON.stringify(o)}</option>`)}
            </select>
        `;
    }
    return JSON.stringify(output);
}

function JSONOutput() {
    return html`
        <button onClick=${saveURL}>save as URL</button> or click the JSON to copy that to clipboard
        <pre onClick=${e => copyText(e.target)}>${
            JSON.stringify(Object.fromEntries(selections), undefined, 2)
        }</pre>
    `;
}

function JSONInput() {
    return html`
        <button onClick=${() => {
            const input = document.getElementById('input-json').value;
            for (const [key, value] of Object.entries(JSON.parse(input))) {
                selections.set(key, value);
            }
            paint();
        }}>Load JSON</button>
        <textarea rows=10 id="input-json"></textarea>
    `;
}

async function saveURL() {
    const encoded = `${encodeURI(JSON.stringify(Object.fromEntries(selections)))}`;
    location.hash = encoded;

    await navigator.clipboard.writeText(location.toString());
    alert('Text copied to clipboard');
}

async function copyText(element) {
    await navigator.clipboard.writeText(element.innerText);
    alert('Text copied to clipboard');
}

ready = true;
paint();
