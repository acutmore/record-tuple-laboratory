// @ts-check
import { html, render } from 'https://unpkg.com/htm/preact/standalone.module.js'

const paint = () => render(html`<${App} />`, document.body);

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
    const match = design.find(v => v.input === input);
    if (match) {
        if (Array.isArray(match.output) && match.output.includes(output)) {
            Map.prototype.set.call(selections, input, output);
            paint();
        }
    }
    return selections;
};

const concerns = {
    withoutBox: html`<details><summary>⚠ complexity moved to ecosystem</summary>
        Using <a href="https://github.com/tc39/proposal-symbols-as-weakmap-keys">symbols-as-weakmap-keys</a>, symbols in Record and Tuples could still refer to objects/functions in a WeakMap.
        Code will need to ensure the nessesary code has access to these WeakMap side tables.
        APIs conventions will need to be established to distinguish when symbols are being used in this way.
        Care will need to be taken with the WeakMaps, if a Map is used by accident there is a risk of memory leaks.
        Unless direct access to the WeakMap is hidden behind a wrapper, other code could remove/replace the referenced
        object.</details>`,
    typeofPowerfulObjectIsNotObject: html`<details><summary>⚠ security risk</summary>
        Existing security sensitive code checks if a value has no-power by checking if it's typeof is not 'object' or 'function',
        and will assume values with other results are safe to pass-around without further inspection.
        These projects may not be updated before they start to interact with Records and Tuples.</details>`,
    validWeakValue: html`<details><summary>⚠ Consistency change</summary>
        Current code can rely on the consistency that values that have typeof 'object' and are not null can be stored weakly.
        If R&T introduces values that have typeof 'object' but throw when placed in a WeakSet this consistency is no longer reliable.
        And code will need to be updated </details>`,
    weakSetLeak: html`<details><summary>⚠ Memory leak</summary>
        If values are allowed in a WeakSet that are impossible to be garbage-collected this could create a silent memory leak</details>`,
    slotSensitiveTypeof: html`<details><summary>⚠ Slot sensitive typeof</summary>
        If typeof a record or tuple changes depending on if there is a box transitively within its tree this makes typeof confusing.
        Code will have to rely on static methods like Record.isRecord instead.</details>`,
}

const typeofBox =  { input: `typeof Box`, output: ['box', 'object', 'undefined'], concern: () => {
    if (noBox()) {
        return concerns.withoutBox;
    }
    if (selections.get(typeofBox.input) !== 'object') {
        return concerns.typeofPowerfulObjectIsNotObject;
    }
}};
const noBox = () => selections.get(typeofBox.input) === 'undefined' ? `typeof Box === 'undefined'` : false;

const typeofTuple = { input: `typeof #[]`, output: ['tuple', 'object'], concern: () => {
    if ((!noBox()) && selections.get(typeofTuple.input) !== selections.get(typeOfTupleWithBox.input)) {
        return concerns.slotSensitiveTypeof;
    }
}};

const typeOfTupleWithBox = { input: `typeof #[Box({})]`, output: ['tuple', 'object'], disabled: noBox, concern: () => {
    if (selections.get(typeOfTupleWithBox.input) !== 'object') {
        return concerns.typeofPowerfulObjectIsNotObject;
    }
}};

const weakSetThrowsOnNoBox = { input: `new WeakSet().add(#[]) // throws?`, output: [true, false], concern: () => {
    if (selections.get(weakSetThrowsOnNoBox.input)) {
        if (selections.get(typeofBox.input) === 'object') {
            return concerns.validWeakValue;
        }
    } else {
        return concerns.weakSetLeak;
    }
}};

const weakSetThrowsOnBox = { input: `new WeakSet().add(#[Box({})]) // throws?`, output: [true, false], disabled: noBox};

/**
 * input: a JS snipped
 * output: a string if this is 'given', or an Array of design options
 * disabled: a non-pure function that returns a string if this options is not currently available
 * concern: a non-pure function that returns a string if there is a concern with the design
 */
const design = [
    ...givens,
    { input: `Object.is(#[-0].at(0), -0)`, output: [true, false] },
    { input: `#[+0] === #[-0]`, output: [true, false] },
    { input: `#[NaN] === #[NaN]`, output: [true, false] },
    { input: `Object.is(#[+0], #[-0])`, output: [false, true] },
    { input: `Object.is(#[NaN], #[NaN])`, output: [true, false] },
    typeofBox,
    typeofTuple,
    typeOfTupleWithBox,
    { input: `Box(42) // throws?`, output: [true, false], disabled: noBox },
    { input: `Object(#[]) === #[]`, output: [true, false] },
    weakSetThrowsOnNoBox,
    weakSetThrowsOnBox,
    { input: `new Proxy(#[]) // throws?`, output: [true, false], disabled: noBox },
    { input: `new Proxy(#[Box({})]) // throws?`, output: [true, false], disabled: noBox },
];

for (const {input, output} of design) {
    Array.isArray(output) && selections.set(input, output[Math.floor(Math.random() * output.length)]);
}

// ------------------------------------------------------------------------------------------------

function App() {
    return html`
        <h1>
            Record and Tuple Laboratory 🔬
            <a href="https://github.com/acutmore/record-tuple-laboratory"><img src="./res/github.png" height="30" /></a>
        </h1>
        <table>
            ${design.map(c => {
                const disabled = c.disabled?.() ?? false;
                const concerns = c.concern?.() ?? false;
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

        <div class="scrollable" style=${{ marginTop: '50px', float: 'left' }}><${JSONOutput} /></div>
        <div class="scrollable" style=${{ marginTop: '50px', float: 'left' }}><${JSONInput} /> </div>
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
        Click text to copy to clipboard.
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

async function copyText(element) {
    await navigator.clipboard.writeText(element.innerText);
    alert('Text copied to clipboard');
}

paint();
