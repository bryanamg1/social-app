export default {
    testEnvironment: "node",            // entorno Node
    clearMocks: true,                   // limpia mocks entre tests
    /* setupFilesAfterEnv: ["<rootDir>/tests/setup.js"], // setup global */
    transform: {"^.+\\.js$": "babel-jest"}                       // necesario para ESM
};
