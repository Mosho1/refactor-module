const relative = require('require-relative');
var register;
try {
  register = relative('babel-register', process.cwd());
} catch(e1) {
  console.log(`can't find babel-register, trying babel-core/register...`);
  try {
    register = relative('babel-core/register', process.cwd());
  } catch(e2) {
    console.log(`can't find babel-core/register, using globally installed babel-register...`);
    try {
      register = require('babel-register');
    } catch(e3) {
      console.error(e3);
    }
  }
}

require('./build/program');
