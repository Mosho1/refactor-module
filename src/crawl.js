import * as babel from 'babel-core';
import Promise from 'bluebird';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
_.mixin({ 'flatMap': _.compose(_.flatten, _.map) });
Promise.promisifyAll(babel);
Promise.promisifyAll(fs);

const plugin = ({types: t}) => {
	return {
		visitor: {
			ImportDeclaration(nodePath, {opts: {path: {src, dest}, deps, cwd}}) {
				// path.get('source').replaceWith(t.)
				const source = nodePath.get('source');
				const importPath = source.node.value;
				const style = importPath.indexOf('/') > -1 ? 'forward' : 'backward';
				const absolute = path.resolve(path.dirname(path.join(cwd, src)), importPath);
				const relative = absolute.replace(cwd, '').replace(/^\\/, '');

				const dep = _.find(deps, x => x.src === relative);

				if (dep) {
					let newPath = path.relative(path.dirname(dest), dep.dest);
					if (style === 'forward') {
						newPath = newPath.replace('\\', '/');
					}
					source.replaceWith(t.StringLiteral(newPath));
				}
			}
		}
	};
};

const isObject = value => value && typeof value === 'object';

const iterateObject = (obj, cb) => {
	const keys = Object.keys(obj);
	for (let i = 0, len = keys.length; i < len; i++) {
		const key = keys[i];
		cb(obj[key], key, obj);
	}
};

const traverse = (obj, cb, context = '') => {
	iterateObject(obj, (val, key) => {

		const path = context ? context + '.' + key : key;
		const isObj = isObject(val);

		cb(val, key, path, obj, isObj);
		if (isObj) {
			// obj[key] instead of val to take changes as we traverse into account
			traverse(obj[key], cb, path);
		}
	});
};

class TreeGenerator {

	constructor(cwd) {
		this.cwd = cwd;
	}

	tree = {};
	modules = {};
	counter = 0;

	generateTree(module, cwd = this.cwd) {

		const relPath = path.relative(cwd, module.id);

		const id = this.counter++;

		this.modules[id] = module;

		const arrPath = relPath.split(/[\\\/]/);

		const last = arrPath.splice(-1, 1)[0];

		const files = _.get(this.tree, arrPath, []).concat([last, id]);

		const pathWithFilesAndFolders = _.flatMap(arrPath, x => ['folders', x]).concat('files');

		_.set(this.tree, pathWithFilesAndFolders, files);

		module.children.forEach(c => this.generateTree(c, cwd));

		return this.tree;
	}

	treeToPaths(tree = this.tree, cwd = this.cwd) {
		const paths = [];
		traverse(tree, (val, key, path, obj, isObj) => {
			if (typeof val === 'number') {
				const pathArr = path
					.split('.')
					.filter((p, i) => i % 2) // remove 'files', 'folders'
					.slice(0, -1) // remove last in path (the index in the tuple of [filename, id])
					.concat(obj[0]); // add the file name

				paths[val] = pathArr.join('\\');
			}
		});
		return paths;
	}

	src = _.memoize(function(module) {
		const tree = this.generateTree(module);
		return this.src = {
			paths: this.treeToPaths(tree),
			tree
		};
	});

	dest(tree) {
		return this.dest = {
			paths: this.treeToPaths(tree),
			tree
		};
	}

	getDeps(i) {
		i = typeof i === 'number' ? i : _.findIndex(this.src.tree, x => x === i);
		const {children} = this.modules[i];
		return children
			.map(x => path.relative(this.cwd, x.id))
			.map(src => {
				const ind = this.src.paths.indexOf(src);
				const dest = this.dest.paths[ind];
				return {src, dest};
			});
	}
}

const test = {
    'folders': {
        'test': {
            'files': [
                'index.js',
                1
            ],
            'folders': {
                'inner': {
                    'files': [
                        'index.js',
                        0
                    ]
                }
            }
        }
    }
};

const transformImports = async (path, opts) => {
	const transformed = await babel.transformFileAsync(path, {
		plugins: [[plugin, opts]]
	});
	return transformed;
};

const getGeneratorForFile = _.memoize((fileName, cwd) => {
	fileName = path.resolve(path.join(
		path.normalize(cwd),
		path.normalize(fileName))
	);

	require(fileName);
	const gen = new TreeGenerator(cwd);
	return gen;
}, (...args) => JSON.stringify(args));

const crawl = async (fileName, cwd = process.cwd()) => {
	const gen = getGeneratorForFile(fileName, cwd);
	const root = require.cache[fileName];
	const generated = gen.src(root);
	await fs.writeFileAsync('test.json', JSON.stringify(generated.tree, null, 4));
	return generated;
};

const refactor = async (fileName, tree, cwd = process.cwd()) => {
	const gen = getGeneratorForFile(fileName, cwd);
	const root = require.cache[fileName];
	const {paths} = gen.src(root);
	const dest = gen.dest(tree);

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
		console.log(transformed.code)
	}

};

const run = async () => {
	try {
		await crawl('./test/index.js', __dirname);
	} catch(e) {
		console.error(e.stack);
	}
};

run();
