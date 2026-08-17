import { MODULE_METADATA } from "@nestjs/common/constants";

describe("AppModule route safety", () => {
  it("does not register the retired unauthenticated debug controller", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "route-safety-test";
    const { AppModule } = jest.requireActual<typeof import("./app.module")>("./app.module");
    process.env.NODE_ENV = originalNodeEnv;

    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule)).toEqual([]);
  });
});
