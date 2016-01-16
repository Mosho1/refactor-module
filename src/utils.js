const isObject = value => value && typeof value === 'object';

const iterateObject = (obj, cb) => {
	const keys = Object.keys(obj);
	for (let i = 0, len = keys.length; i < len; i++) {
		const key = keys[i];
		cb(obj[key], key, obj);
	}
};

export const traverse = (obj, cb, context = '') => {
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
