const request = require('request');
const session = require('./optic-session');
const {simpleJson, longJson} = require('./test-bodies');

const assertValidEnv = (callback) => {
	callback(request.defaults({
		baseUrl: `http://localhost:4000`,
		strictSSL: false,
		timeout: 100000,
	}));
};

describe('documenting library connects to Optic:', () => {

	describe('logging service handles request method', () => {

		const testMethod = (method, done, r) => {
			session((done1) => r('/test-endpoint', {method: method}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(request.method).toBe(method.toUpperCase())
				done();
			});
		};

		it('get', (done) => assertValidEnv((r) => testMethod('get', done, r)));
		it('post', (done) => assertValidEnv((r) => testMethod('post', done, r)));
		it('put', (done) => assertValidEnv((r) => testMethod('put', done, r)));
		it('delete', (done) => assertValidEnv((r) => testMethod('delete', done, r)));
		it('patch', (done) => assertValidEnv((r) => testMethod('patch', done, r)));
		it.skip('head', (done) => assertValidEnv((r) => testMethod('head', done, r)));
		it('options', (done) => assertValidEnv((r) => testMethod('options', done, r)));

	});

	describe('logging service handles query parameters', () => {

		it('finds no query parameters when none', (done) => assertValidEnv((r) => {
			session((done1) => r.get('/test-endpoint', {qs: {}}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(Object.entries(request.queryParameters).length).toBe(0)
				done();
			});
		}));

		it('finds one query parameter', (done) => assertValidEnv((r) => {
			session((done1) => r.get('/test-endpoint?one=first', {}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(Object.entries(request.queryParameters).length).toBe(1)
				expect(request.queryParameters.one).toBe('first')
				expect(request.url).toBe('/test-endpoint')
				done();
			});
		}));

		it('creates array from duplicate keys', (done) => assertValidEnv((r) => {
			session((done1) => r.get('/test-endpoint?one=first&one=second', {}, done1), (samples) => {
				const {request, response} = samples[0];

				expect(Object.entries(request.queryParameters).length).toBe(1)
				expect(request.queryParameters.one).toEqual(['first', 'second'])
				expect(request.url).toBe('/test-endpoint')
				done();
			});
		}));

	});

	describe('logging service handles request headers', () => {
		it('finds application headers when set', (done) => assertValidEnv((r) => {
			session((done1) => r.get('/test-endpoint', {headers: {'MyApp': 'Header'}}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(request.headers.myapp).toBe('Header');
				done();
			});
		}));
	});

	describe('logging service handles request body', () => {
		it('empty when not set', (done) => assertValidEnv((r) => {
			session((done1) => r.post('/test-endpoint', {}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(Object.entries(request.body).length).toBe(0)
				done();
			});
		}));

		it('works when short json', (done) => assertValidEnv((r) => {
			session((done1) => r.post('/test-endpoint', {
				json: simpleJson,
				headers: {'Content-Type': 'application/json'}
			}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(request.body).toEqual(simpleJson)
				done();
			});
		}));

		it('works when long json', (done) => assertValidEnv((r) => {
			session((done1) => r.post('/test-endpoint', {
				json: longJson,
				headers: {'Content-Type': 'application/json'}
			}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(request.body).toEqual(longJson)
				done();
			});
		}));

		it('works when text', (done) => assertValidEnv((r) => {
			const text = 'Hello world \n I am Optic';
			session((done1) => r.post('/test-endpoint', {
				body: text,
				headers: {'content-type': 'text/plain'}
			}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(request.body).toEqual(text)
				done();
			});
		}));

		//This seems to be a bad test. Every API Framework handles this differently.
		// it('will not log body w/o content type', (done) => assertValidEnv((r) => {
		// 	const text = 'Hello world \n I am Optic'
		// 	session((done1) => r.get('/test-endpoint', {body: text}, done1), (samples) => {
		// 		const {request, response} = samples[0]
		// 		assert.deepEqual(request.body, {})
		// 		done()
		// 	})
		// }))
	});

	describe('logging service collects all status codes', () => {
		it('collects 200, 401, 404', (done) => assertValidEnv((r) => {
			session((done1) => {
				const promises = [
					r.get('/test-endpoint', {headers: {'return-status': '200'}}),
					r.get('/test-endpoint', {headers: {'return-status': '401'}}),
					r.get('/test-endpoint', {headers: {'return-status': '404'}})
				];

				Promise.all(promises).then(done1);
			}, (samples) => {
				const set = new Set(samples.map(i => i.response.statusCode));
				expect(set.has('200')).toBeTruthy();
				expect(set.has('401')).toBeTruthy()
				expect(set.has('404')).toBeTruthy()
				done();
			});
		}));

	});

	describe('logging service handles response body', () => {
		it('empty when not set', (done) => assertValidEnv((r) => {
			session((done1) => r.post('/test-endpoint', {}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(Object.entries(response.body).length).toBe(0);
				done();
			});
		}));

		it('works when short json', (done) => assertValidEnv((r) => {
			session((done1) => r.post('/test-endpoint', {json: simpleJson}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(request.body).toEqual(simpleJson);
				done();
			});
		}));

		it('works when long json', (done) => assertValidEnv((r) => {
			session((done1) => r.post('/test-endpoint', {json: longJson}, done1), (samples) => {
				const {request, response} = samples[0];
				expect(request.body).toEqual(longJson);
				done();
			});
		}));

	});
});
