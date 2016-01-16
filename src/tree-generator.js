import _ from 'lodash';
import path from 'path';
import {traverse} from './utils';
export default class TreeGenerator {

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

		const last = arrPath.pop();

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

	setSrc = _.memoize(function(module) {
		const tree = this.generateTree(module);
		return this.src = {
			paths: this.treeToPaths(tree),
			tree
		};
	}, module => module.id);

	setDest(tree) {
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
