const WORDS = `
a about acima ainda alem algo algumas alguns ali ano anos antes ao aos apenas apos
aquela aquelas aquele aqueles aqui as assim at ate com como contra da das de dela
delas dele deles demais depois desde dessa desse desta deste deve devem dia dias
do dos doze duas e ela elas ele eles em entre era eram essa essas esse esses esta
estas este estes eu foi for foram ha isso isto ja la lado lhe lo mais mas me menos
mesma mesmas mesmo mesmos meu meus minha minhas muito muita muitas muitos na nao
nas nem no nos nossa nossas nosso nossos num numa nunca o os ou outra outras outro
outros para pela pelas pelo pelos per pode podem por porque qual quais quando que
quem se sem ser seu seus so sobre sua suas tal tambem te tem tempo ter teu teus
the and or of to in on for with without from by at as an is are was were be been
this that these those it its into over under again more most some such only than
too very can will just don should now
`.trim();

export const STOPWORDS = new Set(WORDS.split(/\s+/).filter(Boolean));
