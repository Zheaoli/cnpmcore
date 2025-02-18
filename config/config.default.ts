import assert from 'assert';
import { join } from 'path';
import { EggAppConfig, PowerPartial } from 'egg';
import OSSClient from 'oss-cnpm';
import { patchAjv } from '../app/port/typebox';
import { ChangesStreamMode, SyncDeleteMode, SyncMode } from '../app/common/constants';
import { CnpmcoreConfig } from '../app/port/config';

export const cnpmcoreConfig: CnpmcoreConfig = {
  name: 'cnpm',
  hookEnable: false,
  hooksLimit: 20,
  sourceRegistry: 'https://registry.npmjs.org',
  sourceRegistryIsCNpm: false,
  syncUpstreamFirst: false,
  sourceRegistrySyncTimeout: 180000,
  taskQueueHighWaterSize: 100,
  syncMode: SyncMode.none,
  syncDeleteMode: SyncDeleteMode.delete,
  syncPackageWorkerMaxConcurrentTasks: 10,
  triggerHookWorkerMaxConcurrentTasks: 10,
  createTriggerHookWorkerMaxConcurrentTasks: 10,
  syncPackageBlockList: [],
  enableCheckRecentlyUpdated: true,
  enableSyncBinary: false,
  syncBinaryFromAPISource: '',
  enableSyncDownloadData: false,
  syncDownloadDataSourceRegistry: '',
  syncDownloadDataMaxDate: '',
  enableChangesStream: false,
  checkChangesStreamInterval: 500,
  changesStreamRegistry: 'https://replicate.npmjs.com',
  changesStreamRegistryMode: ChangesStreamMode.streaming,
  registry: 'http://localhost:7001',
  alwaysAuth: false,
  allowScopes: [
    '@cnpm',
    '@cnpmcore',
    '@example',
  ],
  allowPublishNonScopePackage: false,
  allowPublicRegistration: true,
  admins: {
    cnpmcore_admin: 'admin@cnpmjs.org',
  },
  enableWebAuthn: false,
  enableCDN: false,
  cdnCacheControlHeader: 'public, max-age=300',
  cdnVaryHeader: 'Accept, Accept-Encoding',
  enableStoreFullPackageVersionManifestsToDatabase: false,
  enableNpmClientAndVersionCheck: true,
  syncNotFound: false,
  redirectNotFound: true,
  enableUnpkg: true,
};

export default (appInfo: EggAppConfig) => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.cnpmcore = cnpmcoreConfig;

  // override config from framework / plugin
  config.dataDir = join(appInfo.root, '.cnpmcore');

  config.orm = {
    client: 'mysql',
    database: process.env.MYSQL_DATABASE || 'cnpmcore',
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD,
    charset: 'utf8mb4',
    logger: {},
  };

  config.redis = {
    client: {
      port: 6379,
      host: '127.0.0.1',
      password: '',
      db: 0,
    },
  };

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.cors = {
    // allow all domains
    origin: (ctx): string => {
      return ctx.get('Origin');
    },
    credentials: true,
  };

  config.nfs = {
    client: null,
    dir: join(config.dataDir, 'nfs'),
  };
  /* c8 ignore next 17 */
  // enable oss nfs store by env values
  if (process.env.CNPMCORE_NFS_TYPE === 'oss') {
    assert(process.env.CNPMCORE_NFS_OSS_BUCKET, 'require env CNPMCORE_NFS_OSS_BUCKET');
    assert(process.env.CNPMCORE_NFS_OSS_ENDPOINT, 'require env CNPMCORE_NFS_OSS_ENDPOINT');
    assert(process.env.CNPMCORE_NFS_OSS_ID, 'require env CNPMCORE_NFS_OSS_ID');
    assert(process.env.CNPMCORE_NFS_OSS_SECRET, 'require env CNPMCORE_NFS_OSS_SECRET');
    config.nfs.client = new OSSClient({
      cdnBaseUrl: process.env.CNPMCORE_NFS_OSS_CDN,
      endpoint: process.env.CNPMCORE_NFS_OSS_ENDPOINT,
      bucket: process.env.CNPMCORE_NFS_OSS_BUCKET,
      accessKeyId: process.env.CNPMCORE_NFS_OSS_ID,
      accessKeySecret: process.env.CNPMCORE_NFS_OSS_SECRET,
      defaultHeaders: {
        'Cache-Control': 'max-age=0, s-maxage=60',
      },
    });
  }

  config.logger = {
    enablePerformanceTimer: true,
    enableFastContextLogger: true,
  };

  config.logrotator = {
    // only keep 1 days log files
    maxDays: 1,
  };

  config.bodyParser = {
    // saveTag will send version string in JSON format
    strict: false,
    // set default limit to 10mb, see https://github.com/npm/npm/issues/12750
    jsonLimit: '10mb',
  };

  // https://github.com/xiekw2010/egg-typebox-validate#%E5%A6%82%E4%BD%95%E5%86%99%E8%87%AA%E5%AE%9A%E4%B9%89%E6%A0%A1%E9%AA%8C%E8%A7%84%E5%88%99
  config.typeboxValidate = { patchAjv };

  config.httpclient = {
    useHttpClientNext: true,
  };

  config.view = {
    root: join(appInfo.baseDir, 'app/port'),
    defaultViewEngine: 'nunjucks',
  };

  config.customLogger = {
    sqlLogger: {
      file: 'sql.log',
    },
  };

  return config;
};
