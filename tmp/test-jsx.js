const patternAttr = "^\\+92 3\\d{2} \\d{7}$";
console.log("Literal JS string:", patternAttr);
const re = new RegExp(patternAttr);
console.log("RegExp tests '+92 309 0333107' against new RegExp(patternAttr):", re.test('+92 309 0333107'));
