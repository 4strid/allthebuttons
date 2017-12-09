console.time('test')
arr = []
for (i = 0; i < 10000; i++) { arr.push(i % 10) }
string = arr.join('')
console.timeEnd('test')

console.log(string)
