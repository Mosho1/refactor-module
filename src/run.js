import {crawl, refactor} from './crawl';

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

const run = async () => {
	try {
		const fileName = './test/index.js';
		const generated = await crawl(fileName, __dirname);
		await refactor(fileName, test, 'wat3', __dirname);
	} catch(e) {
		console.error(e.stack);
	}
};

run();
