import { SourcesMap } from "@ton-community/func-js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export const getSourceMap = (list: string[], pathPrefix: string): SourcesMap =>
  list.reduce(
    (ac, cur) => ({
      ...ac,
      [`${cur}`]: readFileSync(join(pathPrefix, cur), {
        encoding: "utf-8",
      }),
    }),
    {}
  );

export const getFolderFilesNames = (folderPath: string) =>
  readdirSync(folderPath, { withFileTypes: true })
    .filter((item) => !item.isDirectory())
    .map((item) => item.name);
