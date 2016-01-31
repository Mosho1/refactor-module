import _ from 'lodash';
import path from 'path';
import {traverse} from './utils';
import Module from 'module';

const ModuleProtoRequire = Module.prototype.require;

const moduleChildrenCache = {};

// HACK: normal require doesn't populate a module's children array if the child
// has already been required by another module, so we keep this list of depedencies.
Module.prototype.require = function(mod) {
	const required = ModuleProtoRequire.apply(this, arguments);
	if (mod.indexOf('.') === 0) {
		moduleChildrenCache[this.id] = moduleChildrenCache[this.id] || [];
		const cached = require.cache[Module._resolveFilename(mod, this)];
		moduleChildrenCache[this.id].push(cached);
	}
	return required;
};



_.mixin({
	flatMap: _.compose(_.flatten, _.map),
	update: (obj, p, fn, dflt) =>
		_.set(obj, p, fn(_.get(obj, p, dflt)))
});


export default class TreeGenerator {

	constructor(cwd) {
		this.cwd = cwd;
	}

	tree = {};
	modules = {};
	modulesArray = [];
	counter = 0;

	generateTree(module, cwd = this.cwd) {


		if (this.modulesArray.indexOf(module) > -1) {
			return this.tree;
		}

		const relPath = path.relative(cwd, module.id);

		const id = this.counter++;

		this.modules[id] = module;
		this.modulesArray.push(module);

		const arrPath = relPath.split(/[\\\/]/);

		const last = arrPath.pop();

		const pathWithFilesAndFolders = _.flatMap(arrPath, x => ['folders', x]).concat('files');

		_.update(
			this.tree,
			pathWithFilesAndFolders,
			x => _.assign(x, {[id]: last}),
			{}
		);

		module.children.forEach(c => this.generateTree(c, cwd));

		return this.tree;
	}

	treeToPaths(tree = this.tree, cwd = this.cwd) {
		const paths = [];
		traverse(tree, (val, key, path, obj, isObj) => {
			if (typeof val === 'string') {
				const pathArr = path
					.split('.')
					.filter(x => x !== 'files' && x !== 'folders') // remove 'files', 'folders'
					.slice(0, -1) // remove last in path (the index in the tuple of [filename, id])
					.concat(val); // add the file name

				paths[key] = pathArr.join('\\');
			}
		});
		return paths;
	}

	setSrc = _.memoize(function(mod) {
		const tree = this.generateTree(mod);
		return this.src = {
			paths: this.treeToPaths(tree),
			tree
		};
	}, mod => mod && mod.id);

	setDest(tree) {
		return this.dest = {
			paths: this.treeToPaths(tree),
			tree
		};
	}

	getDeps(i) {
		i = typeof i === 'number' ? i : _.findIndex(this.src.tree, x => x === i);
		const {id} = this.modules[i];
		const children = _.find(moduleChildrenCache, (val, key) => key === id) || [];

		return children
			.map(x => path.relative(this.cwd, x.id))
			.map(src => {
				const ind = this.src.paths.indexOf(src);
				const dest = this.dest.paths[ind];
				return {src, dest};
			});
	}
}
