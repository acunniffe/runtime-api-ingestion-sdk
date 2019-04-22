const request = require('request');
const session = require('./optic-session');
const {simpleJson, longJson} = require('./test-bodies');

describe('echo server', () => {

	const assertValidEnv = (callback) => {
		callback(request.defaults({
			baseUrl: `http://localhost:4000`,
			strictSSL: false,
			timeout: 100000,
		}), {});
	};

	it('handles requests to any path with 200', (done) => assertValidEnv((r) => {
		const testUrl = (url, method) => new Promise((resolve, reject) => {
			r(url, {method}, (err, response) => {
				return (err) ? resolve(false) : resolve(response.statusCode === 200);
			});
		});
		Promise.all([
			testUrl('/hello/world', 'GET'),
			testUrl('/hello/world', 'POST'),
			testUrl('/test-endpoint', 'POST'),
			testUrl('/test/123', 'POST'),
			testUrl('/any/12/route', 'POST'),
		]).then((arr) => {
			expect(arr.every((i) => i)).toBeTruthy();
			done();
		}).catch(() => {
			done.fail(new Error('Requests to one or more paths failed'))
		});

	}));


	it('returns request headers as response headers', (done) => assertValidEnv((r) => {
		r.get('/test-endpoint', {headers: {'example-one': 'set', 'example-two': 'set'}}, (err, response) => {
			expect(response.headers['example-one']).toBe('set')
			expect(response.headers['example-two']).toBe('set')
			done();
		});
	}));

	it('returns request body as response body with correct types', (done) => assertValidEnv((r) => {
		const body = {first: 'one', second: 'two', third: 'third'};
		r.post('/test-endpoint', {json: body}, (err, response, resBody) => {
			expect(typeof resBody).toBe('object')
			expect(body).toEqual(resBody)
			expect(response.headers['content-type']).toContain('application/json')
			done();
		});
	}));

	it('"return-status" header overrides status code', (done) => assertValidEnv((r) => {

		const testStatusCode = (status) => new Promise((resolve, reject) => {
			r('/test-endpoint', {headers: {'return-status': status.toString()}}, (err, response) => (err) ? resolve(false) : resolve(response.statusCode === status));
		});

		Promise.all([
			testStatusCode(200),
			testStatusCode(204),
			testStatusCode(405),
			testStatusCode(412),
			testStatusCode(311),
		]).then((arr) => {
			expect(arr.every((i) => i)).toBeTruthy();
			done();
		}).catch(() => {
			done.fail(new Error('Status codes not pulled from header for one or more'))
			done();
		});

	}));

});
