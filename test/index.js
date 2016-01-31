import { expect } from 'chai';
import commands from '../src/commands';
import TreeGenerator from '../src/tree-generator';
import uncache from 'require-uncache';
import {getCachedModule, resolvePath} from '../src/crawl';
import path from 'path';
import del from 'del';

const moduleIndex = './testModule/index.js';
const outPath = path.resolve(__dirname, './out');

const moduleTree = {
    'folders': {
        'testModule': {
            'files': {
                '0': 'index.js',
                '2': 'javascriptRules.js'
            },
            'folders': {
                'innerFolder': {
                    'files': {
                        '1': 'moreCodez.js',
                        '3': 'codez.js'
                    }
                }
            }
        }
    }
};

const modulePaths = [ 'testModule\\index.js',
  'testModule\\innerFolder\\moreCodez.js',
  'testModule\\javascriptRules.js',
  'testModule\\innerFolder\\codez.js' ];

const requireUncached = mod => {
	uncache(resolvePath(mod, __dirname));
	return require(mod);
};

describe('tree-generator', () => {
	let gen;

	beforeEach(() => {
		gen = new TreeGenerator(__dirname);
	});

	it('should create a tree generator', () => {
		expect(gen.cwd).to.equal(__dirname);
	});

	describe('tree and paths generation', () => {

		let mod, tree;
		beforeEach(() => {
			requireUncached(moduleIndex);
			mod = getCachedModule(moduleIndex, __dirname);
			tree = gen.generateTree(mod);
		});

		it('should generate a tree based on a module', () => {
			expect(tree).to.eql(moduleTree);
		});

		it('should generate paths from previously generated tree', () => {
			expect(gen.treeToPaths()).to.eql(gen.treeToPaths(tree));
		});

		it('should generate paths matching the tree', () => {
			expect(gen.treeToPaths(tree)).to.eql(modulePaths);
		});
	});

});

describe('refactor-module', () => {

	afterEach(async function() {
		await del(outPath);
	});

	it('should not change files if the tree is the same', async function() {
		const tree = await commands.generateTree(moduleIndex, {cwd: __dirname, out: false});
		const out = outPath;
		await commands.refactor(moduleIndex, {
			tree,
			out,
			cwd: __dirname
		});
		const treeAfterRefactor = await commands.generateTree(moduleIndex, {cwd: out, out: false});
		expect(treeAfterRefactor).to.eql(tree);
	});

	const refactoredModule = 'refactoredModule';
	const refactoredModuleIndex = `./${refactoredModule}/a/index.js`;

	const newTree = {
		'folders': {
			[refactoredModule]: {
				folders: {
					a: {
						files: {
							'0': 'index.js'
						}
					},
					b: {
						files: {
							'2': 'javascriptRules.js'
						}
					},
					c: {
						files: {
							'1': 'moreCodez.js'
						}
					},
					d: {
						files: {
							'3': 'codez.js'
						}
					}
				}
			}
		}
	};

	it('should refactor files', async function() {
		await commands.refactor(moduleIndex, {
			tree: newTree,
			out: outPath,
			cwd: __dirname
		});
		const treeAfterRefactor = await commands.generateTree(refactoredModuleIndex, {cwd: outPath, out: false});
		expect(treeAfterRefactor).to.eql(newTree);
	});
});
