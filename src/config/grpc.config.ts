import { join } from "path";
import { registerAs } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";
import * as fs from 'fs';
import * as protoLoader from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';

export const GRPC_LISTENER_CONFIG_KEY = 'grpcListener';

/**
 * @TODO 
 * Решить проблему с загрузкой импортов протофайлов
 */
export const grpcListenerConfig = registerAs(GRPC_LISTENER_CONFIG_KEY, () => {
  const protoDir = join(process.cwd(), 'node_modules', '@metastate-is', 'proto-models');

  // const googleProtoDir = join(process.cwd(), 'node_modules', 'google-proto-files');

  // Пути к файлам
  // const markTypesProto = join(protoDir, 'metastate', 'kafka', 'spectra', 'v1', 'mark_types.proto');
  const reputationProto = join(protoDir, 'metastate', 'grpc', 'spectra', 'v1', 'reputation_context.proto');
  // const wrappersProto = join(googleProtoDir, 'google', 'protobuf', 'wrappers.proto');

  // Проверка существования
  [reputationProto].forEach(protoPath => {
    console.log('gRPC Config: Proto path:', protoPath);
    if (fs.existsSync(protoPath)) {
      console.log('gRPC Config: ✅ File exists');
    } else {
      console.error('gRPC Config: ❌ File NOT FOUND');
      throw new Error(`Proto file not found: ${protoPath}`);
    }
  });

  // Загрузка ВСЕХ файлов в правильном порядке: сначала зависимости!
  const packageDefinition = protoLoader.loadSync(
    [
      // wrappersProto,     // базовые типы
      // markTypesProto,    // содержит OffchainMarkType, OnchainMarkType
      reputationProto,   // использует mark_types.proto
    ],
    {
      keepCase: false,
      longs: String,
      enums: Number,
      defaults: true,
      oneofs: true,
      includeDirs: [
        // googleProtoDir,   // для google/protobuf/...
        protoDir,         // для metastate/...
      ],
    }
  );

  console.log('gRPC Config: PackageDefinition loaded. Types:', Object.keys(packageDefinition));

  return {
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${process.env.GRPC_SERVER_PORT || '50060'}`,
      package: 'metastate.grpc.spectra.v1',
      packageDefinition,
      onLoadPackageDefinition: (pkgDef, server) => {
        const reflection = new ReflectionService(pkgDef);
        reflection.addToServer(server);
        console.log('gRPC Config: Reflection service added with full proto set');
        return pkgDef;
      },
    },
  };
});