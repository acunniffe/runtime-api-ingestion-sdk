#!/usr/bin/env node
const program = require('commander');
const pJson = require('./package')
const path = require('path')
const ncp = require('ncp')
const fs = require('fs')
const yaml = require('js-yaml')
const hostIp = require('ip').address()
const {spawn, execSync} = require('child_process')
const waitPort = require('wait-port');
const colors = require('colors')
const mocha = require('mocha')

// const cwd = process.cwd()
const cwd = path.join(process.cwd(), 'node-example')

program.version(`contract: ${pJson['spec-version']} | cli ${pJson.version}`)

process.on('exit', cleanUp);
process.on('SIGINT', cleanUp);


//Init command
program.command('init')
.action(function (cmd) {
	const source = path.join(__dirname, 'example')
	const destination = path.join(__dirname, 'output')

	//copy files into current directory
	ncp(source, path.join(__dirname, destination), (callback) => {
		console.log('Runtime API Integration boilerplate cloned in: '+ destination)
	})
})

program.command('runDocker')
.option('-p, --port <n>', 'bind echo server to local port, default 4000', parseInt, 4000)
.action(({port}) => runDocker(port, true))

program.command('testEcho')
.action((cmd) => test({echo: true}))

program.command('testLibrary')
.action((cmd) => test({library: true}))

program.command('testAll')
.action((cmd) => test({echo: true, library: true}))

program.command('publish')
.action((cmd) => {
	const publishCommands = loadConfig().publish || []
	if (!publishCommands.length) {
		throw new Error('No publish commands specified.')
	} else {
		execArgs(publishCommands, 'Running publish task')
	}
})

program.parse(process.argv);

//Helpers
function runDocker(port, verbose) {
	const {dockerFile, containerName} = loadConfig()
	const buildStage = 'docker-build'
	const echoServer = 'echo-server'

	return new Promise((resolve, reject) => {
		const build = spawn(`docker`, ['build', '.', '-t', containerName], {cwd})// build . -t "${containerName}"`)
		log('Running Docker Build...', buildStage)

		build.stdout.on('data', (data) => log(data.toString(), buildStage));
		build.stderr.on('data', (data) => log(data.toString(), buildStage, true));

		build.on('close', (code) => {
			if (code !== 0) {
				console.log(colors.red('Unable to build docker container. Quiting'))
				reject()
				return process.exit()
			}

			const start = spawn(`docker`, ['run', '-p', `${port}:4000`, `--add-host=testhost:${hostIp}`, '-e', 'OPTIC_SERVER_LISTENING=TRUE', '-e', 'OPTIC_SERVER_HOST=testhost', containerName], {cwd})
			log(`Starting echo server on port ${port}...`, echoServer)
			start.stdout.on('data', (data) => log(data.toString(), echoServer));
			start.stderr.on('data', (data) => log(data.toString(), echoServer, true));

			waitPort({host: 'localhost', port: port, output: 'silent'})
			.then((open) => {
				if (open) {
					runningDockerProcess = start
					setTimeout(() => resolve({port, process: start}), 500)
				} else {
					reject('port did not open')
				}
			})
		})
	})
}

function test({echo, library}) {

	const before_tests = loadConfig().before_tests || []

	execArgs(before_tests, 'Running before_tests')

	const promise = runDocker(4000, true)

	promise.then(({port, process}) => {
		const Mocha = require('mocha')
		const mocha = new Mocha({});

		if (echo) {
			mocha.addFile(path.join(__dirname, 'specs', 'shared-echo-server-tests.js'))
		}
		if (library) {
			mocha.addFile(path.join(__dirname, 'specs', 'shared-library-tests.js'))
		}

		const testRunner = 'test-runner'

		log('Running Tests', testRunner)

		let someFailed = false

		mochaProcess = mocha.run((failures) => {
			process.exitCode = failures ? 1 : 0;
			cleanUp()
		})
	})

	promise.catch(() => {
		console.error('Could not start echo server')
		process.exit()
	})


}

function loadConfig() {
	const yamlFile = path.join(cwd, 'integration.yml')
	if (!fs.existsSync(yamlFile)) {
		throw new Error('integration.yml not found in '+ cwd)
	}

	const config = yaml.safeLoad(fs.readFileSync(yamlFile, 'utf8'))

	if (config.spec_version !== pJson['spec-version']) {
		throw new Error(`Please update the CLI. Integration impliments ${config.spec_version} and your current CLI version validates ${pJson['spec-version']}`)
	}

	return {
		...config,
		dockerFile: path.join(cwd, 'Dockerfile'),
		containerName: `test/${config.slug}`
	}
}

function log(data, from, error) {
	const color = ({
		'docker-build': colors.blue,
		'echo-server': colors.magenta,
		'test-runner': colors.green,
		'helper': colors.grey
	})[from]
	if (error) {
		console.log(`${color(`[${from}]`)} ${color.red(data.trim())}`)
	} else {
		console.log(`${color(`[${from}]`)} ${data.trim()}`)
	}
}

function logTestAssertion() {
	const {slug} = loadConfig()
	log(`Testing if ${slug} conforms to Optic runtime library spec ${pJson['spec-version']}`, 'test-runner')
	log(`Running CLI version ${pJson.version}\n\n`, 'test-runner')
}

let runningDockerProcess = null
let mochaProcess = null
function cleanUp() {
	if (runningDockerProcess) {
		runningDockerProcess.kill()
	}
	if (mochaProcess) {

	}
}

function execArgs(input, taskDesc) {
	let commands = []

	if (Array.isArray(input)) {
		commands = input
	} else {
		commands = [input]
	}

	console.log(commands)

	log(taskDesc, 'helper')
	commands.forEach(command => execSync(command, {cwd}))
}
