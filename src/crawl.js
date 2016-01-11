import * as babel from 'babel-core';
import Promise from 'bluebird';
import path from 'path';
import _ from 'lodash';
_.mixin({ 'flatMap': _.compose(_.flatten, _.map) });

Promise.promisifyAll(babel);

const plugin = ({types: t}) => {
	return {
		visitor: {
			ImportDeclaration(path) {
				console.log(path);
			}
		}
	};
};

// let transformed = await babel.transformFileAsync('./src/test/index.js', {
// 		plugins: [plugin]
// 	});

class TreeGenerator {

	tree = {};

	generateTree(module, cwd) {
		const relPath = path.relative(cwd, module.id);

		const arrPath = relPath.split(/[\\\/]/);

		const last = arrPath.splice(-1, 1)[0];

		const files = _.get(this.tree, arrPath, []).concat(last);

		const pathWithFilesAndFolders = _.flatMap(arrPath, x => ['folders', x]).concat('files');

		_.set(this.tree, pathWithFilesAndFolders, files);
		module.children.forEach(c => this.generateTree(c, cwd));

		return this.tree;
	}
}

const crawl = async (fileName, cwd) => {
console.log(fileName, cwd)
	fileName = path.resolve(path.join(
		path.normalize(cwd),
		path.normalize(fileName))
	);

	require(fileName);
	const root = require.cache[fileName];
	const gen = new TreeGenerator();
	const tree = gen.generateTree(root, cwd);
	console.log(tree)
};

const run = async () => {
	try {
		await crawl('./test/index.js', __dirname);
	} catch(e) {
		console.error(e.stack);
	}
};

run();

