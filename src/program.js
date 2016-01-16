import program from 'commander';

export default program.version('0.0.1');

program
  .command('generate-tree <entry> <out>')
  .action((entry, out) => {
    console.log(entry, out, program);

  });

program
  .command('refactor <entry>', 'refactor the module')
  .option('-o, --out <value>', 'set output directory')
  .action(entry => {
      console.log(entry, program.out);
      process.exit(0);
  });
