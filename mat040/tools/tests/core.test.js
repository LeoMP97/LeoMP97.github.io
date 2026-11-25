const MAT = require(require('path').join(__dirname, '..', '..') + '/assets/js/core.js');
const {check, F, Frac, T} = MAT;
let fails = 0, n = 0;
function t(desc, got, want){ n++; if (got !== want){ fails++; console.log('FAIL', desc, '=>', got, '(want', want+')'); } }
const ok = (field, input) => check(field, input).ok;

// numbers
t('int', ok({type:'num',ans:9},'9'), true);
t('int wrong', ok({type:'num',ans:9},'8'), false);
t('commas', ok({type:'num',ans:16800},'16,800'), true);
t('neg unicode', ok({type:'num',ans:-3},'−3'), true);
t('frac eq', ok({type:'num',ans:F(3).div(4)},'3/4'), true);
t('frac dec', ok({type:'num',ans:F(3).div(4)},'0.75'), true);
t('frac unreduced', ok({type:'num',ans:F(3).div(4)},'6/8'), false);
t('frac unreduced msg', /lowest/.test(check({type:'num',ans:F(3).div(4)},'6/8').msg), true);
t('mixed accepted', ok({type:'num',ans:F(10).div(3),form:'mixed'},'3 1/3'), true);
t('mixed rejects improper', ok({type:'num',ans:F(10).div(3),form:'mixed'},'10/3'), false);
t('mixed any', ok({type:'num',ans:F(10).div(3)},'3 1/3'), true);
t('neg frac', ok({type:'num',ans:F(-7).div(2)},'-7/2'), true);
t('neg frac2', ok({type:'num',ans:F(-7).div(2)},'-3.5'), true);
t('x=5', ok({type:'num',ans:5},'x = 5'), true);
t('dec form', ok({type:'num',ans:F(1).div(4),form:'dec'},'1/4'), false);
t('garbage', check({type:'num',ans:5},'abc').invalid, true);
t('empty', check({type:'num',ans:5},'  ').empty, true);
t('arith disallowed', ok({type:'num',ans:8},'2*4'), false);
t('arith allowed', ok({type:'num',ans:8,allowArith:true},'2*4'), true);
t('thirds', ok({type:'num',ans:F(1).div(3)},'1/3'), true);

// expr
t('expr eq', ok({type:'expr',ans:'5x+3'},'3+5x'), true);
t('expr distrib', ok({type:'expr',ans:'2x+6'},'2(x+3)'), true);
t('expr simplify reject', ok({type:'expr',ans:'5x+3',simplify:true},'2x+3x+3'), false);
t('expr simplify accept', ok({type:'expr',ans:'5x+3',simplify:true},'5x+3'), true);
t('expr simplify paren', ok({type:'expr',ans:'2x+6',simplify:true},'2(x+3)'), false);
t('expr frac coef', ok({type:'expr',ans:'x/2+1'},'(1/2)x+1'), true);
t('expr xy', ok({type:'expr',ans:'3xy-2'},'3yx-2'), true);
t('expr power', ok({type:'expr',ans:'x^2+2x+1'},'(x+1)^2'), true);
t('expr neg', ok({type:'expr',ans:'-3x+5'},'5-3x'), true);
t('expr wrong', ok({type:'expr',ans:'5x+3'},'5x+4'), false);
t('expr 6+n', ok({type:'expr',ans:'n+6'},'n+6'), true);
t('simplified -x', MAT.looksSimplified('-x+5'), true);
t('simplified 3x-2y+4', MAT.looksSimplified('3x-2y+4'), true);
t('simplified 2+3', MAT.looksSimplified('2+3'), false);

// equations
t('eq slope int', ok({type:'eq',ans:'y=2x+3',lhs:'y'},'y = 2x+3'), true);
t('eq slope int wrong form', ok({type:'eq',ans:'y=2x+3',lhs:'y'},'2x - y = -3'), false);
t('eq std ok no lhs', ok({type:'eq',ans:'y=2x+3'},'2x - y = -3'), true);
t('eq scaled', ok({type:'eq',ans:'y=2/3x-1'},'2x-3y=3'), true);
t('eq wrong', ok({type:'eq',ans:'y=2x+3'},'y=2x+4'), false);
t('eq vertical', ok({type:'eq',ans:'x=-2'},'x=-2'), true);
t('eq horizontal', ok({type:'eq',ans:'y=2',lhs:'y'},'y=2'), true);
t('eq y on both', ok({type:'eq',ans:'y=2x+3',lhs:'y'},'y = 2x + 3 + 0y'), false);
t('eq invalid', check({type:'eq',ans:'y=2'},'y 2').invalid, true);
t('eq pointslope', ok({type:'eq',ans:'y=2/5x-1'},'y-3=2/5(x-10)'), true);

// pair / system
t('pair', ok({type:'pair',ans:[F(3),F(-2)]},'(3, -2)'), true);
t('pair nopar', ok({type:'pair',ans:[F(3),F(-2)]},'3,-2'), true);
t('pair frac', ok({type:'pair',ans:[F(1).div(2),F(-2)]},'(1/2,-2)'), true);
t('pair wrong', ok({type:'pair',ans:[F(3),F(-2)]},'(-2,3)'), false);
t('sys none', ok({type:'sys',ans:'none'},'No solution'), true);
t('sys inf', ok({type:'sys',ans:'inf'},'infinitely many'), true);
t('sys pair', ok({type:'sys',ans:[F(4),F(-1)]},'(4,-1)'), true);
t('sys pair vs none', ok({type:'sys',ans:[F(4),F(-1)]},'no solution'), false);

// inequalities
const iv = MAT.mkInterval;
t('ineq x<5', ok({type:'ineq',ans:iv(-Infinity,false,F(5),false)},'x<5'), true);
t('ineq 5>x', ok({type:'ineq',ans:iv(-Infinity,false,F(5),false)},'5>x'), true);
t('ineq <=', ok({type:'ineq',ans:iv(-Infinity,false,F(1),true)},'x ≤ 1'), true);
t('ineq >= asc', ok({type:'ineq',ans:iv(F(-3),true,Infinity,false)},'x>=-3'), true);
t('ineq open vs closed', ok({type:'ineq',ans:iv(F(-3),true,Infinity,false)},'x>-3'), false);
t('ineq frac', ok({type:'ineq',ans:iv(-Infinity,false,F(-3).div(5),true)},'x<=-3/5'), true);
t('ineq dec', ok({type:'ineq',ans:iv(-Infinity,false,F(-3).div(5),true)},'x<=-0.6'), true);
t('ineq compound', ok({type:'ineq',ans:iv(F(-2),false,F(5),true)},'-2<x<=5'), true);
t('ineq compound rev', ok({type:'ineq',ans:iv(F(-2),false,F(5),true)},'5>=x>-2'), true);
t('ineq wrong var', ok({type:'ineq',variable:'n',ans:iv(-Infinity,false,F(5),false)},'x<5'), false);
t('interval', ok({type:'interval',ans:iv(F(-3),true,Infinity,false)},'[-3, inf)'), true);
t('interval inf sym', ok({type:'interval',ans:iv(F(-3),true,Infinity,false)},'[-3,∞)'), true);
t('interval neg inf', ok({type:'interval',ans:iv(-Infinity,false,F(5,2)?F(5).div(2):0,false)},'(-∞, 2.5)'), true);
t('interval bracket inf', ok({type:'interval',ans:iv(F(-3),true,Infinity,false)},'[-3,∞]'), false);
t('interval frac', ok({type:'interval',ans:iv(-Infinity,false,F(-3).div(5),true)},'(-inf, -3/5]'), true);
t('interval swapped brackets', ok({type:'interval',ans:iv(F(2),false,F(5),true)},'[2,5]'), false);

// lists, prime factorization
t('list ordered', ok({type:'list',ordered:true,ans:[F(5).div(8),F(2).div(3)]},'5/8, 2/3'), true);
t('list ordered wrong', ok({type:'list',ordered:true,ans:[F(5).div(8),F(2).div(3)]},'2/3, 5/8'), false);
t('list unordered', ok({type:'list',ans:[1,2,3]},'3,1,2'), true);
t('pf', ok({type:'primefact',ans:60},'2^2*3*5'), true);
t('pf dot', ok({type:'primefact',ans:60},'2·2·3·5'), true);
t('pf wrong', ok({type:'primefact',ans:60},'4*3*5'), false);
t('pf x sep', ok({type:'primefact',ans:352},'2^5 x 11'), true);
t('pf prime', ok({type:'primefact',ans:17},'17'), true);
t('pf (2)(3)', ok({type:'primefact',ans:6},'2*3'), true);

// choice, multi, text
t('choice', ok({type:'choice',ans:1},'1'), true);
t('multi', ok({type:'multi',ans:[0,2]},['2','0']), true);
t('multi wrong', ok({type:'multi',ans:[0,2]},['0']), false);
t('text', ok({type:'text',ans:['prime']},' Prime '), true);

// TeX helpers
t('lin', T.lin([[2,'x'],[-3,'']]), '2x - 3');
t('lin -x', T.lin([[-1,'x'],[4,'']]), '-x + 4');
t('lin frac', T.lin([[F(-2).div(3),'x'],[-3,'']]), '-\\frac{2}{3}x - 3');
t('slopeInt zero b', T.slopeInt(F(1).div(2),0), 'y=\\frac{1}{2}x');
t('interval tex', T.interval(-Infinity,false,F(5),true), '(-\\infty,\\ 5]');
t('commas', T.commas(16800), '16{,}800');
t('exact', ok({type:'exact',ans:['12+(15+8)']},' 12 + [15+8] '), true);
t('exact wrong', ok({type:'exact',ans:['12+(15+8)']},'(12+15)+8'), false);
t('expanded', ok({type:'expanded',ans:[3000,500,0,2,F(2).div(10),F(3).div(100)]},'3000+500+2+2/10+3/100'), true);
t('expanded dec', ok({type:'expanded',ans:[3000,500,0,2,F(2).div(10),F(3).div(100)]},'3000 + 500 + 0 + 2 + 0.2 + 0.03'), true);
t('expanded wrong', ok({type:'expanded',ans:[3000,500,0,2,F(2).div(10),F(3).div(100)]},'3502.23'), false);
t('choice arr', ok({type:'choice',ans:[0,1]},'1'), true);
console.log(n+' tests, '+fails+' failures');
process.exit(fails?1:0);
