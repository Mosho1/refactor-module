import * as babel from 'babel-core';
import Promise from 'bluebird';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import TreeGenerator from './tree-generator';
import plugin from './babel-plugin';
import del from 'del';

const delAsync = Promise.promisify(del);

Promise.promisifyAll(babel);
Promise.promisifyAll(fs);


const transformImports = async function(_path, opts) {
	const transformed = await babel.transformFileAsync(_path, {
		babelrc: false,
		plugins: [[plugin, opts]]
	});
	return transformed;
};

export const resolvePath = (fileName, cwd = process.cwd()) => path.resolve(path.join(
	path.normalize(cwd),
	path.normalize(fileName))
);

export const getCachedModule = (fileName, cwd) => require.cache[resolvePath(fileName, cwd)];

const safeRequire = fileName => {
	try {
		return require(fileName);
	} catch(e) {
		console.error(`refactor-module: couldn't require module: ${fileName}`)
		throw e;
	}
};

export const getGeneratorForFile = _.memoize((fileName, cwd = process.cwd()) => {
	fileName = resolvePath(fileName, cwd);
	safeRequire(fileName);
	const gen = new TreeGenerator(cwd);
	return gen;
}, (...args) => JSON.stringify(args));

export const crawl = async function(fileName, cwd) {
	const gen = getGeneratorForFile(fileName, cwd);
	const root = getCachedModule(fileName, cwd);
	const generated = gen.setSrc(root);
	return generated.tree;
};

export const refactor = async function(fileName, tree, destPath, cwd = process.cwd()) {
	const gen = getGeneratorForFile(fileName, cwd);
	const root = getCachedModule(fileName, cwd);
	const {paths} = gen.setSrc(root);
	const destData = gen.setDest(tree);
	const transformed = await Promise.all(paths.map((src, i) => {
		const deps = gen.getDeps(i);
		const dest = destData.paths[i];
		return transformImports(path.join(cwd, src), {
			path: {src, dest},
			cwd,
			deps
		});
	}));

	return transformed.map((t, i) => ({
		code: t.code,
		src: paths[i],
		dest: path.join(destPath, destData.paths[i])
	}));
};
