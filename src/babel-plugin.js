import _ from 'lodash';
import path from 'path';

const relativePath = (f, t) => {
	let ret = path.relative(f, t);
	if (ret.indexOf('.') !== 0) {
		ret = `./${ret}`;
	}
	return ret;
};

const addJsExtension = p => p.replace(/(\.js)?$/, '.js');

export default ({types: t}) => {

	const replaceFileName = (fileNamePath, {path: {src, dest}, deps, cwd}) => {
		const log = (...args) => src.indexOf('code') > -1 && console.log(...args);
		const fileName = fileNamePath.node.value;
		const slashStyle = fileName.indexOf('/') > -1 ? 'forward' : 'backward';
		const hasExtension = fileName.split('.').length === 2;
		const absolute = path.resolve(path.dirname(path.join(cwd, src)), fileName);
		const relative = absolute.replace(cwd, '').replace(/^\\/, '');
		const dep = _.find(deps, x => addJsExtension(x.src) === addJsExtension(relative));
		if (dep) {
			let newPath = relativePath(path.dirname(dest), dep.dest);
			if (slashStyle === 'forward') {
				newPath = newPath.replace(/\\/g, '/');
				if (hasExtension) {
					newPath = addJsExtension(newPath);
				}
			}
			fileNamePath.replaceWith(t.StringLiteral(newPath));
		}
	};

	return {
		visitor: {
			CallExpression(nodePath, state) {
				const fnName = nodePath.get('callee').node.name;
				if (fnName !== 'require') {
					return;
				}
				const requirePath = nodePath.get('arguments.0');
				replaceFileName(requirePath, state.opts);
			},

			ImportDeclaration(nodePath, state) {
				const importPath = nodePath.get('source');
				replaceFileName(importPath, state.opts);
			}
		}
	};
};
