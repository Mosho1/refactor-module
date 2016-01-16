import * as babel from 'babel-core';
import Promise from 'bluebird';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import TreeGenerator from './tree-generator';
import plugin from './babel-plugin';

_.mixin({ 'flatMap': _.compose(_.flatten, _.map) });
Promise.promisifyAll(babel);
Promise.promisifyAll(fs);

const mkdirpAsync = Promise.promisify(mkdirp);

const transformImports = async (path, opts) => {
	const transformed = await babel.transformFileAsync(path, {
		babelrc: false,
		plugins: [[plugin, opts]]
	});
	return transformed;
};

const resolvePath = (fileName, cwd = process.cwd()) => path.resolve(path.join(
	path.normalize(cwd),
	path.normalize(fileName))
);

const getCachedModule = (fileName, cwd) => require.cache[resolvePath(fileName, cwd)];

const getGeneratorForFile = _.memoize((fileName, cwd = process.cwd()) => {
	fileName = resolvePath(fileName, cwd);
	require(fileName);
	const gen = new TreeGenerator(cwd);
	return gen;
}, (...args) => JSON.stringify(args));

export const crawl = async function(fileName, cwd = process.cwd()) {
	const gen = getGeneratorForFile(fileName, cwd);
	const root = getCachedModule(fileName, cwd);
	const generated = gen.setSrc(root);
	await fs.writeFileAsync('test.json', JSON.stringify(generated.tree, null, 4));
	return generated;
};

export const refactor = async function(fileName, tree, destPath = process.cwd(), cwd = process.cwd()) {
	const gen = getGeneratorForFile(fileName, cwd);
	const root = getCachedModule(fileName, cwd);
	const {paths} = gen.setSrc(root);
	const dest = gen.setDest(tree);
	for (let [i] of paths.entries()) {

		const deps = gen.getDeps(i);
		const transformed = await transformImports(path.join(cwd, paths[i]), {
			path: {
				src: paths[i],
				dest: dest.paths[i]
			},
			cwd,
			deps
		});
		const pathToWrite = path.join(destPath, dest.paths[i]);
		await mkdirpAsync(path.dirname(pathToWrite));
		await fs.writeFileAsync(pathToWrite, transformed.code);
	}

};
