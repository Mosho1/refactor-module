import {refactor, crawl} from './crawl';
import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

const mkdirpAsync = Promise.promisify(mkdirp);
Promise.promisifyAll(fs);


const moduleTreeFileName = 'module-tree.json';

const tryCatch = fn => async function(...args) {
	try {
		return await fn(...args);
	} catch(e) {
		console.error(e.stack);
	}
};

const commands = {

	async generateTree(entry, {out = moduleTreeFileName, cwd = process.cwd()} = {}) {
		const tree = await crawl(entry, cwd);
		if (out) {
			await fs.writeFileAsync(out, JSON.stringify(tree, null, 4));
		}
		return tree;
	},

	async refactor(entry, {tree = moduleTreeFileName, out = process.cwd(), cwd = process.cwd()} = {}) {

		if (typeof tree === 'string') {
			const buf = await fs.readFileAsync(tree);
			tree = JSON.parse(buf);
		}

		const sourcesToWrite = await refactor(entry, tree, out, cwd);

		await Promise.all(sourcesToWrite.map(async function({code, src, dest}) {
			await mkdirpAsync(path.dirname(dest));
			await fs.writeFileAsync(dest, code);
			// console.log(`moved "${src}" to "${dest}"`);
		}));

	}

};

export default _.mapValues(commands, tryCatch);
