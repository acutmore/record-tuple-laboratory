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

/** @type {Map<string, string | boolean>} */
const selections = new Map();
const set = (input, output) => {
    selections.set(input, output);
    paint();
};

const typeofBox =  { input: `typeof Box`, output: ['box', 'object', 'undefined'], concern: () => {
    if (noBox()) {
        return `complexity moved to ecosystem`;
    }
}};
const noBox = () => selections.get(typeofBox.input) === 'undefined' ? `typeof Box === 'undefined'` : false;

/**
 * input: a JS snipped
 * output: a string if this is 'given', or an Array of design options
 * disabled: a non-pure function that returns a string if this options is not currently available
 * concern: a non-pure function that returns a string if there is a concern with the design
 */
const design = [
    ...givens,
    typeofBox,
    { input: `Object.is(#[-0].at(0), -0)`, output: [true, false] },
    { input: `#[+0] === #[-0]`, output: [true, false] },
    { input: `#[NaN] === #[NaN]`, output: [true, false] },
    { input: `Object.is(#[+0], #[-0])`, output: [false, true] },
    { input: `Object.is(#[NaN], #[NaN])`, output: [true, false] },
    { input: `typeof #[]`, output: ['tuple', 'object'] },
    { input: `Box(42) // throws?`, output: [true, false], disabled: noBox },
    { input: `typeof #[Box({})]`, output: ['tuple', 'object'], disabled: noBox },
    { input: `Object(#[]) === #[]`, output: [true, false] },
    { input: `new WeakSet().add(#[]) // throws?`, output: [true, false] },
    { input: `new WeakSet().add(#[Box({})]) // throws?`, output: [false, true], disabled: noBox },
    { input: `new Proxy(#[]) // throws?`, output: [true, false], disabled: noBox },
    { input: `new Proxy(#[Box({})]) // throws?`, output: [true, false], disabled: noBox },
];

for (const {input, output} of design) {
    selections.set(input, Array.isArray(output) ? output[0] : output);
}

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
                                : concerns
                                    ? `⚠️ ${concerns}`
                                    : ''}
                        </td>
                    </tr>
                `
            })}
        </table>

        <div class="scrollable" style=${{ marginTop: '50px' }}>
             Click text to copy to clipboard.
            <pre onClick=${e => copyText(e.target)}>${
                JSON.stringify(Object.fromEntries(selections), undefined, 2)
            }</pre>
        </div>

        <div class="scrollable">
            <button onClick=${() => {
                const input = document.getElementById('input-json').value;
                for (const [key, value] of Object.entries(JSON.parse(input))) {
                    const match = design.find(v => v.input === key);
                    if (match) {
                        if (Array.isArray(match.output) && match.output.includes(value)) {
                            selections.set(key, value);
                        }
                    }
                }
                paint();
            }}>Load JSON</button>
            <textarea rows=10 id="input-json"></textarea>
        </div>
    `;
}

function Selection({input, output, disabled }) {
    if (Array.isArray(output)) {
        return html`
            <select onChange=${e => set(input, e.target.value)} disabled=${disabled} >
                ${output.map(o => html`<option selected=${selections.get(input) === o} value=${o}>${JSON.stringify(o)}</option>`)}
            </select>
        `;
    }
    return JSON.stringify(output);
}

async function copyText(element) {
    await navigator.clipboard.writeText(element.innerText);
    alert('Text copied to clipboard');
}

paint();
