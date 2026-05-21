var fs = require('fs')
var path = require('path')
var { createGoblinWorldApp } = require('./server/goblinworld/app')

function loadLocalEnv() {
	var envPath = path.join(__dirname, '.env')
	if (!fs.existsSync(envPath)) return

	fs.readFileSync(envPath, 'utf8')
		.split(/\r?\n/)
		.forEach(function(line) {
			var trimmed = line.trim()
			if (!trimmed || trimmed[0] === '#') return
			var separator = trimmed.indexOf('=')
			if (separator === -1) return
			var key = trimmed.slice(0, separator).trim()
			var value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
			if (key && process.env[key] === undefined) process.env[key] = value
		})
}

loadLocalEnv()
var port = process.env.PORT || 5000
var app = createGoblinWorldApp()
app.listen(port)
console.log('GoblinWorld server started ' + port)
