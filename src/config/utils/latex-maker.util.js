function runLatexMaker() {
  return new Promise((resolve) => {
    const args = [
      '-pdf',
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-no-shell-escape', //No seell command from tex
      '-file-line-error',
      '-outdir=' + dir,
      'doc.tex',
    ];

    const child = spawn;
  });
}
