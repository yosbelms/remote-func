# Watchdog
The Watchdog detects and stop long running functions.

The JS code is transformed through a Babel plugin to insert Watchdog checks inside each loop (`for`, `while`, `do while`), and each arrow function.

If the check scope is `async`, the Watchdog awaits for a `Promise` that resolves immediately to give the opportunity to other functions to tun in the execution thread, this function is collaborative, does not hijack the execution thread, so, it is allowed to run 10 minutes default.

If the scope is not `async`, that means that the main thread can be hijacked if the execution is not stopped, so,it is allowed to run 100 milliseconds max.

The Watchdog stops the function by throwing a `TimeoutError` if the time is consumed in each case.

Finally, a check in inserted on each `catch`, and `finally` in case any long running code is inside those statements.
