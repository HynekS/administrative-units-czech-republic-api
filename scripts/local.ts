import apiGatewayEvent from "../api-gateway-event.json";
import * as lambdaFunction from "../src/lambda";
import { Context, Callback } from "aws-lambda";

const context = {} as Context;

const callback: Callback = (_e: any, _v: any) => {};

const server: void | Promise<any> = lambdaFunction.handler(
  apiGatewayEvent,
  context,
  callback
);

(async () => {
  try {
    const response = await server;

    // print and exit
    console.log(response);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

process.stdin.resume();

function exitHandler(options: any, err: any) {
  console.log("exitHandler: ", options, err);
  // @ts-ignore
  if (options.cleanup && server && server.close) {
    // @ts-ignore
    server.close();
    process.kill(process.pid, "SIGINT");
  }

  if (err) {
    console.error(err.stack);
  }
  process.kill(process.pid, "SIGINT");
  //if (options.exit)
  //process.exit();
}

process.once("SIGUSR2", function () {
  process.kill(process.pid, "SIGUSR2");
});
process.on("exit", exitHandler.bind(null, { cleanup: true }));
process.on("SIGINT", exitHandler.bind(null, { exit: true })); // ctrl+c event
process.on("SIGTSTP", exitHandler.bind(null, { exit: true })); // ctrl+v event
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
