// @ts-check
// @ts-expect-error
import { html, render } from "https://unpkg.com/htm/preact/standalone.module.js";

let appLoaded = false;
let paintScheduled = true;
const paintSync = () => {
	if (!appLoaded) return;
	render(html`<${App} />`, document.body);
	paintScheduled = false;
};
const schedulePaint = () => {
	if (paintScheduled) return;
	paintScheduled = true;
	Promise.resolve().then(paintSync);
};

const givens = [
	{ input: `typeof []`, output: "object" },
	{ input: `typeof NaN`, output: "number" },
	{ input: `+0 === -0`, output: true },
	{ input: `Object.is(+0, -0)`, output: false },
	{ input: `[-0].includes(+0)`, output: true },
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

/** @type {typeof selections['set']} */
const setSelection = (input, output) => {
	const match = tweakables.find((v) => v.input === input);
	if (match) {
		if (Array.isArray(match.output) && match.output.includes(/** @type {never} */ (output))) {
			if (selections.get(input) !== output) {
				selections.set(input, output);
				if (appLoaded) {
					location.hash = "";
					schedulePaint();
				}
			}
		}
	}
	return selections;
};

/** @typedef {(typeof tweakables)[number]} Tweakable */

/** @param tweakable {{input: string}} */
const get = (tweakable) => selections.get(tweakable.input);

const concerns = {
	withoutBox: html`<details><summary>⚠ complexity moved to ecosystem</summary>
		Using <a href="https://github.com/tc39/proposal-symbols-as-weakmap-keys">symbols-as-weakmap-keys</a>,
		symbols in Record and Tuples could still refer to objects/functions in a WeakMap.
		Code will need to ensure the necessary code has access to these WeakMap side tables.
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
	typeofPowerfulObjectIsNotObject: html`<details>
		<summary>⚠ security risk</summary>
		Existing security sensitive code checks if a value has no-power by checking if it's typeof
		is not 'object' or 'function', and will assume values with other results are safe to
		pass-around without further inspection. These projects may not be updated before they start
		to interact with Records and Tuples.
	</details>`,
	validWeakValue: html`<details>
		<summary>⚠ consistency change</summary>
		Current code can rely on the consistency that values that have typeof 'object' and are not
		null can be stored weakly. If R&T introduces values that have typeof 'object' but throw when
		placed in a WeakSet this consistency is no longer reliable. And code will need to be updated
	</details>`,
	weakSetLeak: html`<details>
		<summary>⚠ memory leak</summary>
		If values are allowed in a WeakSet that are impossible to be garbage-collected this could
		create a silent memory leak
	</details>`,
	slotSensitiveTypeof: html`<details>
		<summary>⚠ slot sensitive typeof</summary>
		If typeof a record or tuple changes depending on if there is a box transitively within its
		tree this makes typeof confusing. Code will have to rely on static methods like
		Record.isRecord instead.
	</details>`,
	confusingTypeof: html`<details>
		<summary>⚠ problematic typeof</summary>
		If a Tuple without a Box in it's tree has typeof 'object', there is no value to be gained
		from a Tuple with a Box having typeof 'tuple', because if anything it is more like an object
		when it contains a Box.
	</details>`,
	objectWrappers: html`<details>
		<summary>⚠ object wrappers</summary>
		Having Object wrappers for Record and Tuple will adds a risk to avoid and confusion when
		using JS.
	</details>`,
	objectWrapperInConsistency: html`<details>
		<summary>⚠ object wrapper consistency</summary>
		Usually values where their typeof is not 'object' or 'function' have Object wrapper versions
		of them.
	</details>`,
	noBoxesInWeakSets: html`<details>
		<summary>⚠ performance</summary>
		Libraries may want to create values based on Records that contain boxes. For example,
		mapping over a record and mapping each Box to something else. If this work is expensive, it
		may be beneficial to memoize the work using a WeakMap. But this wouldn't be possible if
		Records with Boxes can't be WeakMaps keys.
	</details>`,
	unequalTupleNan: html`<details>
		<summary>⚠ consistency change</summary>
		Currently the only value not equal to itself is NaN, and this can be used as a reliable
		check for NaN. If any record or tuple containing a NaN within its tree is also not equal to
		itself, then there would be an infinite number of values not equal to themselves.
		<ul>
			<li>
				<a href="https://github.com/tc39/proposal-record-tuple/issues/65"
					>R&T #65 Equality semantics for -0 and NaN</a
				>
			</li>
		</ul>
	</details>`,
	noNegativeZero: html`<details>
		<summary>⚠ no negative zero</summary>
		<p>
			Negative zero can be stored in a standard Array. If negative zero was transformed into
			positive zero when stored in a tuple, then mapping arrays of numbers to and from tuples
			would not be isomorphic.
		</p>
		<p>Being able to store a negative zero is considered important to some users.</p>
		<ul>
			<li>
				<a href="https://github.com/tc39/proposal-record-tuple/issues/65"
					>R&T #65 Equality semantics for -0 and NaN</a
				>
			</li>
		</ul>
	</details>`,
	impossibleEqualityOfZeros: html`<details>
		<summary>⚠ impossible equality</summary>
		If negative zero can not be stored in a Tuple (converted to +0). Then #[-0] cannot compare
		unequal to #[+0].
	</details>`,
	observableDifferentButIsEqual: html`<details>
		<summary>⚠ Object.is semantics</summary>
		Putting aside that two NaNs can be observably different, by storing them in a TypedArray and
		reading the bits. If Object.is returns true for two values this means the two values are not
		observably different, this is useful for memoization techniques. For a pure function, if the
		inputs have not changed in an observable way then neither should the output. React.js for
		example uses Object.is for its change-detection. If two Tuples compare equal, but have
		observably different values (one has positive zero and the other has negative zero), then
		this changes the semantics of Object.is, and the use cases it can be applied to.
	</details>`,
	nanNotIsNan: html`<details>
		<summary>⚠ Object.is NaN semantics</summary>
		if both 'Object.is(NaN, NaN)' and '#[NaN] === #[NaN]'' are true, there does not appear to be
		a reason for Object.is(#[NaN], #[NaN]) to not be true.
	</details>`,
	canNotAlwaysIntern: html`<details>
		<summary>⚠ can not always intern</summary>
		Object interning is a technique used to reduce memory and speed up certain operations after
		the initial interning cost. If #[+0] equals #[-0] and storing negative zero in a tuple is
		preserved then records and tuple equality can not solely rely on interning.
	</details>`,
	zerosNotTripleEqual: html`<details>
		<summary>⚠ Triple equality semantics</summary>
		As -0 === +0 on their own, it may surprise people that they are no longer treated as triple
		equal when compared via a record or tuple. This could lead to bugs.
		<ul>
			<li>
				<a href="https://github.com/tc39/proposal-record-tuple/issues/65"
					>R&T #65 Equality semantics for -0 and NaN</a
				>
			</li>
		</ul>
	</details>`,
	storingPrimitiveInBox: html`<details><summary>⚠ storing <i>primitives*</i> in a Box</summary>
		<p>
			primitives*: For want of a more appropriate term, in this section the term primitive will have the meaning: a value that can be directly stored in a Record or Tuple.
			i.e. records, tuples, boxes, null, undefined, booleans, numbers, strings, symbols, and bigints.
		</p>
		<p>
			The original rationale for introducing Box is to allow Records and Tuples to explicitly reference a value that would otherwise be disallowed
			to be 'stored' directly within Records and Tuples e.g. functions.
			Values like numbers can already be stored in a Record or Tuple.
			While allowing primitives* to be stored in a Box may be ergonomic for the producer of the Box,
			complexity has been moved to the consumers of Boxes. Consumers can no longer rely on the guarantee that a Box will always
			reference a 'non-primitive*'.
		</p>
		<p>
			It appears that there might be situations where checking if a Record contains an Object or not will be important, because of the difference in semantics.
			e.g. checking for cycles, passing values across a <a href="https://github.com/tc39/proposal-shadowrealm">ShadowRealm</a> boundary,
			or <a href="https://github.com/tc39/proposal-record-tuple/issues/233#issuecomment-895044432">storing values in a WeakMap</a>.
			If primitives* can be stored in a Box, then code checking if a Record/Tuple transitively contains an Object can no
			longer be performed with a single call to a <pre>Box.containsBoxes</pre> predicate, instead different/additional helpers would be needed for this use-case.
			e.g. <pre>Object.containsObject</pre> or <pre>Box.containsBoxWithIdentity</pre>. These helpers <i>may</i> be harder to explain than 'containsBoxes'.
			Note: These helpers can be implemented in user-land, recursively walking the tree inspecting the values. They do not necessarily need to be built-in.
		</p>
		<ul>
			<li><a href="https://github.com/tc39/proposal-record-tuple/issues/238">R&T #238 Behavior of Box(Box(x))</a></li>
			<li><a href="https://github.com/tc39/proposal-record-tuple/issues/231">R&T #231 Boxes: How to expose a way to detect boxes in R&T?</a></li>
		</ul>
		</details>`,
	noPrimitivesInBox: html`<details>
		<summary>⚠ Box construction ergonomics</summary>
		If the Box constructor throws for values that can be 'stored' directly in a Record and
		Tuple, such as strings, numbers, booleans. This adds complexity for code that is trying to
		use Boxes generically, they will now need to check if a value can be put in a Box before
		attempting to construct the Box, or be sure to handle the possibility that an exception will
		be thrown. From a different perspective there could be an advantage to an exception being
		thrown - it <i>may</i> help clarify the purpose of Boxes and make unnecessary boxing
		impossible.
	</details>`,
	recordProxies: html`<details>
		<summary>⚠ Record proxies</summary>
		It appears that a Record-Proxy would not be able to be much different from 'new
		Proxy(Object.freeze({...record}), handler)'. This is because if the Proxy still retained
		Record semantics, then equality checks would need to trigger the traps. Causing arbitrary JS
		to run during previously safe operations like '==='. This means that the returning proxy can
		not be transparent, and will instead be an object and not a record. It could be better to
		throw instead so this API space remains open for new ideas on how to achieve this in the
		future.
	</details>`,
	proxyThrowTypeofObject: html`<details>
		<summary>⚠ proxy ergonomics</summary>
		Usually if something has typeof 'object' then it would be safe to create a proxy of it. But
		if records and tuples are typeof 'object' and throw when passed to the proxy constructor,
		this causes users to update their code to manually convert Records/Tuples into their frozen
		object counterparts before passing them to the proxy constructor.
	</details>`,
	differenceBetweenEqualityForTypeofObject: html`<details>
		<summary>⚠ different equality of an object-like value</summary>
		<p>
			In current JavaScript if two values, 'a' and 'b', both have typeof 'object' then 'a ===
			b' and 'Object.is(a, b)' will always return the same result.
		</p>
		<p>
			The current laboratory setup would mean that this is no longer an invariant of the
			language. Because given two almost identical tuples, except one has positive zero, and
			the other has negative zero. These would both have typeof 'object' and be '===' equal to
			each other, but not equal when compared by Object.is.
		</p>
	</details>`,
};

/**
 * # Tweakables
 * input: a JS snippet
 * output: a string if this is 'given', or an Array of design options
 * disabled: a non-pure function that returns a string if this options is not currently available
 * concern: a non-pure function that returns a string if there is a concern with the design
 *
 * @template {string|boolean} T
 * @param t {{input: string, output: readonly T[], concern : ((self:T) => any), default: T, disabled?: Function }}
 */
function tweakable(t) {
	return t;
}

const typeofBox = tweakable({
	input: `typeof Box`,
	output: ["box", "object", "undefined"],
	default: "undefined",
	concern: (self) => {
		if (noBox()) {
			return concerns.withoutBox;
		}
		if (self !== "object") {
			return concerns.typeofPowerfulObjectIsNotObject;
		}
	},
});

const noBox = () => (get(typeofBox) === "undefined" ? `typeof Box === 'undefined'` : false);

const typeofTuple = tweakable({
	input: `typeof #[]`,
	output: ["tuple", "object"],
	default: "tuple",
	concern: (self) => {
		if (!noBox() && self !== get(typeOfTupleWithBox)) {
			return concerns.slotSensitiveTypeof;
		}
	},
});

const typeOfTupleWithBox = tweakable({
	input: `typeof #[Box({})]`,
	output: ["tuple", "object"],
	default: "tuple",
	disabled: noBox,
	concern: (self) => {
		if (get(typeofTuple) === "object" && self === "tuple") {
			return concerns.confusingTypeof;
		}
		if (self !== "object") {
			return concerns.typeofPowerfulObjectIsNotObject;
		}
	},
});

const storeNegativeZero = tweakable({
	input: `Object.is(#[-0].at(0), -0)`,
	output: [true, false],
	default: true,
	concern: (self) => {
		if (!self) {
			return concerns.noNegativeZero;
		}
	},
});

const tupleNaNAreTripleEqual = tweakable({
	input: `#[NaN] === #[NaN]`,
	output: [true, false],
	default: true,
	concern: (self) => {
		if (!self) {
			return concerns.unequalTupleNan;
		}
	},
});

const zerosAreTripleEqual = tweakable({
	input: `#[+0] === #[-0]`,
	output: [true, false],
	default: true,
	concern: (self) => {
		if (self) {
			if (get(storeNegativeZero)) {
				return concerns.canNotAlwaysIntern;
			}
		} else {
			if (!get(storeNegativeZero)) {
				return concerns.impossibleEqualityOfZeros;
			}
			return concerns.zerosNotTripleEqual;
		}
	},
});

const tweakables = [
	storeNegativeZero,
	zerosAreTripleEqual,
	tupleNaNAreTripleEqual,
	tweakable({
		input: `Object.is(#[+0], #[-0])`,
		output: [false, true],
		default: false,
		concern: (self) => {
			if (self) {
				if (get(storeNegativeZero)) {
					return concerns.observableDifferentButIsEqual;
				}
			} else {
				if (!get(storeNegativeZero)) {
					return concerns.impossibleEqualityOfZeros;
				}
				if (get(typeofTuple) === "object" && get(zerosAreTripleEqual)) {
					return concerns.differenceBetweenEqualityForTypeofObject;
				}
			}
		},
	}),
	tweakable({
		input: `Object.is(#[NaN], #[NaN])`,
		output: [true, false],
		default: true,
		concern: (self) => {
			if (!self && get(tupleNaNAreTripleEqual)) {
				return concerns.nanNotIsNan;
			}
		},
	}),
	typeofBox,
	typeofTuple,
	typeOfTupleWithBox,
	tweakable({
		input: `Box(42) // throws?`,
		output: [true, false],
		default: true,
		disabled: noBox,
		concern: (self) => {
			if (self) {
				return concerns.noPrimitivesInBox;
			} else {
				return concerns.storingPrimitiveInBox;
			}
		},
	}),
	tweakable({
		input: `Object(#[]) === #[]`,
		output: [true, false],
		default: true,
		concern: (self) => {
			if (self) {
				if (get(typeofTuple) !== "object") {
					return concerns.objectWrapperInConsistency;
				}
			} else {
				return concerns.objectWrappers;
			}
		},
	}),
	tweakable({
		input: `new WeakSet().add(#[]) // throws?`,
		output: [true, false],
		default: true,
		concern: (self) => {
			if (self) {
				if (get(typeofBox) === "object") {
					return concerns.validWeakValue;
				}
			} else {
				return concerns.weakSetLeak;
			}
		},
	}),
	tweakable({
		input: `new WeakSet().add(#[Box({})]) // throws?`,
		output: [true, false],
		default: true,
		disabled: noBox,
		concern: (self) => {
			if (self) {
				return concerns.noBoxesInWeakSets;
			}
		},
	}),
	tweakable({
		input: `new Proxy(#[]) // throws?`,
		output: [true, false],
		default: true,
		concern: (self) => {
			if (self) {
				if (get(typeofTuple) === "object") {
					return concerns.proxyThrowTypeofObject;
				}
			} else {
				return concerns.recordProxies;
			}
		},
	}),
	tweakable({
		input: `new Proxy(#[Box({})]) // throws?`,
		output: [true, false],
		default: true,
		disabled: noBox,
		concern: (self) => {
			if (self) {
				if (get(typeOfTupleWithBox) === "object") {
					return concerns.proxyThrowTypeofObject;
				}
			} else {
				return concerns.recordProxies;
			}
		},
	}),
];

// Initialize selections
for (const { input, default: _default } of tweakables) setSelection(input, _default);

const design = [...givens, ...tweakables];

function shuffle() {
	location.hash = "";
	for (const { input, output } of tweakables) {
		Array.isArray(output) &&
			setSelection(input, output[Math.floor(Math.random() * output.length)]);
	}
	schedulePaint();
}

const urlLoadingIssues = (function attemptLoadFromURL() {
	const issues = [];
	try {
		const urlData = location.hash;
		if (!urlData) {
			return [];
		}
		const tweakableKeys = new Map(tweakables.map((t) => [t.input, t]));
		for (const [key, value] of Object.entries(JSON.parse(decodeURI(urlData.slice(1))))) {
			if (!tweakableKeys.has(key)) {
				issues.push(`Unknown item in url: '${key}'`);
			}
			setSelection(key, value);
			tweakableKeys.delete(key);
		}
		for (const [unusedKey, t] of tweakableKeys) {
			if (t.disabled?.()) continue;
			issues.push(`'${unusedKey}' was not set by the URL`);
		}
	} catch (e) {
		console.error(e);
	}
	return issues;
})();

// ------------------------------------------------------------------------------------------------

function App() {
	return html`
		<h1 class="text-center">
			Record and Tuple Laboratory 🔬
			<a href="https://github.com/acutmore/record-tuple-laboratory"
				><img src="./res/github.png" height="30"
			/></a>
		</h1>
		<p class="text-center">
			🏗 Work in progress -
			<a href="https://github.com/acutmore/record-tuple-laboratory/issues/new" target="_blank"
				>raise issue</a
			>
		</p>
		${urlLoadingIssues.length > 0
			? html`
					<ul class="text-center">
						${urlLoadingIssues.map((issue) => html`<li>${issue}</li>`)}
					</ul>
			  `
			: false}
		<p class="text-center">
			<button onClick=${shuffle}>shuffle</button>
		</p>
		<table class="center">
			${design.map((c) => {
				const disabled = "disabled" in c ? c.disabled?.() ?? false : false;
				const currentValue = get(c);
				const concerns = "concern" in c ? c.concern?.(currentValue) ?? false : false;
				const attrs = disabled ? { class: "disabled", title: disabled } : {};
				return html`
					<tr>
						<td ...${attrs}><pre>${c.input}</pre></td>
						<td><${Selection} ...${c} disabled=${disabled} /></td>
						<td width="500em">
							${disabled
								? html`<details>
										<summary>…</summary>
										${disabled}
								  </details>`
								: concerns
								? concerns
								: ""}
						</td>
					</tr>
				`;
			})}
		</table>
		<div class="center" style=${{ width: "500px" }}>
			<div class="scrollable" style=${{ marginTop: "10px", float: "left" }}>
				<${JSONOutput} />
			</div>
			<div class="scrollable" style=${{ marginTop: "10px", float: "left" }}>
				<${JSONInput} />
			</div>
		</div>
	`;
}

function Selection({ input, output, disabled }) {
	if (Array.isArray(output)) {
		return html`
			<select
				onChange=${(e) => setSelection(input, JSON.parse(e.target.value))}
				disabled=${disabled}
			>
				${output.map(
					(o) =>
						html`<option
							selected=${selections.get(input) === o}
							value=${JSON.stringify(o)}
						>
							${JSON.stringify(o)}
						</option>`
				)}
			</select>
		`;
	}
	return JSON.stringify(output);
}

function getStateAsObject() {
	return Object.fromEntries(
		tweakables.filter(t => !(t.disabled?.() ?? false)).map(t => [t.input, get(t)])
	);
}

function JSONOutput() {
	return html`
		<button onClick=${saveURL}>save as URL</button> or click the JSON to copy that to clipboard
		<pre onClick=${(e) => copyText(e.target)}>${
			JSON.stringify(getStateAsObject(), undefined, 2)
		}</pre>
	`;
}

function JSONInput() {
	/** @type {HTMLTextAreaElement} */
	let textArea;
	return html`
		<button
			onClick=${() => {
				const input = textArea.value;
				if (input.trim().length === 0) return;
				for (const [key, value] of Object.entries(JSON.parse(input))) {
					setSelection(key, value);
				}
				schedulePaint();
			}}
		>
			Load JSON
		</button>
		<textarea ref=${(el) => (textArea = el)} rows="10" id="input-json"></textarea>
	`;
}

async function saveURL() {
	const encoded = `${encodeURI(JSON.stringify(getStateAsObject()))}`;
	location.hash = encoded;

	await navigator.clipboard.writeText(location.toString());
	alert("Text copied to clipboard");
}

async function copyText(element) {
	await navigator.clipboard.writeText(element.innerText);
	alert("Text copied to clipboard");
}

appLoaded = true;
paintSync();
