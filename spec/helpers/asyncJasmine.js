/**
    Create async style testing, modeled after jasmine-node
    replaces jasmines it by a modified one:
    it(<desc>,<function(<done>)>,[timeout]);

    The runner function can be specified with a 'done' parameter, if so,
    the test is considered async.
    To finish the async test, call the provided done function.
    If the done function is called with an error as its first parameter, the
    test will fail with that error.

    The timeout can be set by an optional third timeout parameter on 'it',
    which defaults to 5000 ms.
    The timeout can be globally set by setting jasmine.getEnv().defaultTimeoutInterval.

    Instead of taking a done-callback, runners can also return a Thenable (promise),
    which will be waited for; normal resolves are OK, rejections will fail the test.
*/

(function() {

    function isPromise(x) {
        return typeof x === "object" && typeof x.then === "function";
    }

    function getAsyncRunner(desc, runner, timeout) {
        "use strict";
        timeout = timeout || jasmine.getEnv().defaultTimeoutInterval || 5000;
        return function asyncRunner() {
            // Provide a function to be called when asynchronous runner
            // is ready.
            var runnerDone = false;
            function done(err) {
                runnerDone = true;
                if (err) {
                    throw err;
                }
            }

            // Run runner
            var async = false;
            if (runner.length > 0) {
                // Runner uses explicit done callback
                runner(done);
                async = true;
            } else {
                // Runner may be synchronous, or return a promise
                var result = runner();
                if (isPromise(result)) {
                    // Runner returned a promise.
                    // Wait for it to be resolved or rejected.
                    async = true;
                    result.then(function() { done(); }, done);
                }
            }

            // In case of async runner, tell Jasmine to wait for it
            if (async) {
                // Obtain $rootScope to allow pumping digest loop
                var $rootScope;
                angular.mock.inject(["$rootScope", function(_$rootScope_) {
                    $rootScope = _$rootScope_;
                }]);

                waitsFor(function() {
                    $rootScope.$digest();
                    return runnerDone;
                }, desc, timeout);
            }
        };
    }

    function makeAsyncDesc(jasmineFunction) {
        var original = jasmineFunction;
        return function (desc, runner, timeout) {
            original(desc, getAsyncRunner(desc, runner, timeout));
        };
    }

    function makeAsyncNoDesc(jasmineFunction, name) {
        var original = jasmineFunction;
        return function (runner, timeout) {
            original(getAsyncRunner(name, runner, timeout));
        };
    }

    it = makeAsyncDesc(it);
    iit = makeAsyncDesc(iit);
    beforeEach = makeAsyncNoDesc(beforeEach, "beforeEach");
    afterEach = makeAsyncNoDesc(beforeEach, "afterEach");

})();
