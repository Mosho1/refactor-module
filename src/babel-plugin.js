import _ from 'lodash';
import path from 'path';

export default ({types: t}) => {

	const replaceFileName = (fileNamePath, {path: {src, dest}, deps, cwd}) => {
		const fileName = fileNamePath.node.value;
		const style = fileName.indexOf('/') > -1 ? 'forward' : 'backward';
		const absolute = path.resolve(path.dirname(path.join(cwd, src)), fileName);
		const relative = absolute.replace(cwd, '').replace(/^\\/, '');

		const dep = _.find(deps, x => x.src === relative);

		if (dep) {
			let newPath = path.relative(path.dirname(dest), dep.dest);
			if (style === 'forward') {
				newPath = newPath.replace('\\', '/');
			}
			fileNamePath.replaceWith(t.StringLiteral(newPath));
		}
	}

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
