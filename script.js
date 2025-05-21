(() => {
  const expressionEl = document.getElementById('expression');
  const resultEl = document.getElementById('result');
  const buttons = document.querySelectorAll('button');
  let expression = '';
  let memory = 0;
  let lastAnswer = null;
  let isResultDisplayed = false;
  // Factorial function for integers >= 0
  function factorial(n) {
    n = Math.floor(n);
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) {
      res *= i;
    }
    return res;
  }
   // Convert degrees to radians
  function degToRad(deg) {
    return deg * (Math.PI/180);
  }
  // Convert radians to degrees
  function radToDeg(rad) {
    return rad * (180/Math.PI);
  }
  // Replace constants and functions for evaluation
  function preprocess(expr) {
    // Replace π and e constants
    expr = expr.replace(/π/g, 'Math.PI');
    expr = expr.replace(/\be\b/g, 'Math.E');
    // Replace factorial n! with factorial(n)
    // careful with expressions like (3+2)! too: simplify - we replace all n! with factorial(n)
    expr = expr.replace(/(\d+|\([^()]+\))!/g, (match) => {
      let val = match.slice(0, -1);
      return `factorial(${val})`;
    });
     // Replace power operator: a^b => Math.pow(a,b)
    while (expr.includes('^')) {
      expr = expr.replace(/([^\^()]+)\^([^\^()]+)/, 'Math.pow($1,$2)');
    }
    // Override Math trig functions to convert degree input to radians for sin, cos, tan
    // and convert radians to degree for inverse functions asin, acos, atan
    // Replace sin(x) with Math.sin(degToRad(x))
    expr = expr.replace(/\bsin\(/g, 'sin_deg(');
    expr = expr.replace(/\bcos\(/g, 'cos_deg(');
    expr = expr.replace(/\btan\(/g, 'tan_deg(');
    // Replace asin(x) with radToDeg(Math.asin(x))
    expr = expr.replace(/\basin\(/g, 'asin_deg(');
    expr = expr.replace(/\bacos\(/g, 'acos_deg(');
    expr = expr.replace(/\batan\(/g, 'atan_deg(');
     // Replace log(x) -> Math.log10(x)
    expr = expr.replace(/\blog\(/g, 'Math.log10(');
    // ln(x) -> Math.log(x)
    expr = expr.replace(/\bln\(/g, 'Math.log(');
    // sqrt handled as Math.sqrt
    expr = expr.replace(/\bsqrt\(/g, 'Math.sqrt(');
    // exp(x) as Math.exp(x)
    expr = expr.replace(/\bexp\(/g, 'Math.exp(');
    return expr;
  }
   // Custom trigonometric functions converting degree input to radians
  function sin_deg(x) { return Math.sin(degToRad(x)); }
  function cos_deg(x) { return Math.cos(degToRad(x)); }
  function tan_deg(x) { return Math.tan(degToRad(x)); }
  // Inverse trig returning degrees
  function asin_deg(x) { return radToDeg(Math.asin(x)); }
  function acos_deg(x) { return radToDeg(Math.acos(x)); }
  function atan_deg(x) { return radToDeg(Math.atan(x)); }
  // Custom Math.log10 if not defined
  if (!Math.log10) {
    Math.log10 = function(x) {
      return Math.log(x) / Math.LN10;
    }
  }
  function safeEval(expr) {
    try {
      // eslint-disable-next-line no-new-func
      const f = new Function('factorial','sin_deg','cos_deg','tan_deg','asin_deg','acos_deg','atan_deg','degToRad','radToDeg','Math', `return ${expr}`);
      let val = f(factorial,sin_deg,cos_deg,tan_deg,asin_deg,acos_deg,atan_deg,degToRad,radToDeg,Math);
      if (typeof val === 'number' && !isFinite(val)) {
        throw new Error("Math error");
      }
      return val;
    } catch(e) {
      return NaN;
    }
  }
  function updateDisplay() {
    expressionEl.textContent = expression || '\u00A0'; // non breaking space if empty
    if (isResultDisplayed) {
      resultEl.textContent = lastAnswer !== null ? lastAnswer : '0';
    } else {
      resultEl.textContent = expression || '0';
    }
  }
  function clearAll() {
    expression = '';
    lastAnswer = null;
    isResultDisplayed = false;
    updateDisplay();
  }
  function clearEntry() {
    expression = '';
    isResultDisplayed = false;
    updateDisplay();
  }
  function backspace() {
    if (isResultDisplayed) {
      clearAll();
      return;
    }
    if (expression.length > 0) {
      expression = expression.slice(0, -1);
      updateDisplay();
    }
  }
  function appendToExpression(text) {
    if (isResultDisplayed) {
      if (/[\d.]/.test(text)) {
        expression = '';
      }
      isResultDisplayed = false;
    }
    expression += text;
    updateDisplay();
  }
  function calculate() {
    if (!expression) return;
    const processed = preprocess(expression);
    let val = safeEval(processed);
    if (isNaN(val)) {
      lastAnswer = 'Error';
    } else {
      // limit decimals nicely
      val = +val.toPrecision(12);
      lastAnswer = val;
      expression = val.toString();
    }
    isResultDisplayed = true;
    updateDisplay();
  }
  // Memory handling
  function memoryClear() {
    memory = 0;
  }
  function memoryRecall() {
    appendToExpression(memory.toString());
  }
  function memoryAdd() {
    if (!lastAnswer || lastAnswer === 'Error') return;
    memory += Number(lastAnswer);
  }
  function memorySubtract() {
    if (!lastAnswer || lastAnswer === 'Error') return;
    memory -= Number(lastAnswer);
  }
  function handleButtonClick(e) {
    const btn = e.target;
    if (btn.hasAttribute('data-number')) {
      let val = btn.getAttribute('data-number');
      if (val === 'e') val = 'Math.E';
      appendToExpression(val);
    } else if (btn.hasAttribute('data-action')) {
      const action = btn.getAttribute('data-action');
      if (action === 'factorial') {
        appendToExpression('!');
      } else if (action === 'pi') {
        appendToExpression('π');
      } else if (action === '^') {
        appendToExpression('^');
      } else {
        appendToExpression(action);
      }
    } else {
      switch(btn.id) {
        case 'all-clear':
          clearAll();
          break;
        case 'clear-entry':
          clearEntry();
          break;
          case 'backspace':
          backspace();
          break;
        case 'equals':
          calculate();
          break;
        case 'mc':
          memoryClear();
          break;
        case 'mr':
          memoryRecall();
          break;
        case 'mplus':
          memoryAdd();
          break;
        case 'mminus':
          memorySubtract();
          break;
        default:
          break;
      }
    }
  }
  // Keyboard support mapping
  const keyMap = {
    '0': () => appendToExpression('0'),
    '1': () => appendToExpression('1'),
    '2': () => appendToExpression('2'),
    '3': () => appendToExpression('3'),
    '4': () => appendToExpression('4'),
    '5': () => appendToExpression('5'),
    '6': () => appendToExpression('6'),
    '7': () => appendToExpression('7'),
    '8': () => appendToExpression('8'),
    '9': () => appendToExpression('9'),
    '.': () => appendToExpression('.'),
    '+': () => appendToExpression('+'),
    '-': () => appendToExpression('-'),
    '*': () => appendToExpression('*'),
    '/': () => appendToExpression('/'),
    '(': () => appendToExpression('('),
    ')': () => appendToExpression(')'),
    '^': () => appendToExpression('^'),
    '!': () => appendToExpression('!'),
    'Enter': () => calculate(),
     '=': () => calculate(),
    'Backspace': () => backspace(),
    'Delete': () => clearEntry(),
    'c': () => clearEntry(),
    'C': () => clearEntry(),
    'a': () => clearAll(),
    'A': () => clearAll(),
  };
  function handleKeyDown(e) {
    if (keyMap[e.key]) {
      e.preventDefault();
      keyMap[e.key]();
    }
  }
  buttons.forEach(btn => btn.addEventListener('click', handleButtonClick));
  window.addEventListener('keydown', handleKeyDown);
  clearAll();
})();