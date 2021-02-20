// @flow
import fs from "fs";
import * as Sentry from "@sentry/node";
import JSZip from "jszip";
import tmp from "tmp";
import { Attachment, Collection, Document } from "../models";
import { presentCollection } from "../presenters";
import { getImageByKey } from "./s3";

/**
 * Increase headings levels present in markdown content.
 *
 * @param content Markdown content.
 */
export function increaseHeading(content: string): string {
  return content.replace(/^(#+) (.*)$/gm, "$1# $2");
}

async function addToArchive(zip, documents, parentDocument) {
  let result = parentDocument ? parentDocument.title + "\n\n" : "";

  for (const [index, doc] of documents.entries()) {
    const document = await Document.findByPk(doc.id);

    // const metadata = {
    //   position: index,
    //   category: `'${parentDocument ? parentDocument.title : ""}'`,
    //   title: `'${doc.title}'`,
    // };
    // const data = Object.keys(metadata).map((key) => `${key}: ${metadata[key]}`);
    // let text = ["---", ...data, "---", "\n"].join("\n");

    let text = document.toMarkdown();

    const attachments = await Attachment.findAll({
      where: { documentId: document.id },
    });

    for (const attachment of attachments) {
      await addImageToArchive(zip, attachment.key);
      // text = text.replace(attachment.redirectUrl, encodeURI(attachment.key));
      text = text.replace(
        attachment.redirectUrl,
        `https://docs.koji-dev.com${attachment.redirectUrl}`
      );
    }

    result += increaseHeading(text);
    zip.file(`${document.title || "Untitled"}.md`, text);

    if (doc.children && doc.children.length) {
      const folder = zip.folder(document.title);
      await addToArchive(folder, doc.children, doc);
    }

    zip.file(`${document.title || "Untitled"}.md`, text);
  }
  zip.file(`${parentDocument ? parentDocument.title : "Untitled"}.md`, result);
}

async function addImageToArchive(zip, key) {
  try {
    const img = await getImageByKey(key);
    zip.file(key, img, { createFolders: true });
  } catch (err) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }
    // error during file retrieval
    console.error(err);
  }
}

async function archiveToPath(zip) {
  return new Promise((resolve, reject) => {
    tmp.file({ prefix: "export-", postfix: ".zip" }, (err, path) => {
      if (err) return reject(err);

      zip
        .generateNodeStream({ type: "nodebuffer", streamFiles: true })
        .pipe(fs.createWriteStream(path))
        .on("finish", () => resolve(path))
        .on("error", reject);
    });
  });
}

export async function archiveCollection(collection: Collection) {
  const zip = new JSZip();

  if (collection.documentStructure) {
    await addToArchive(zip, collection.documentStructure);
  }

  zip.file("collection.json", JSON.stringify(presentCollection(collection)));

  return archiveToPath(zip);
}

export async function archiveCollections(collections: Collection[]) {
  const zip = new JSZip();

  for (const collection of collections) {
    if (collection.documentStructure) {
      const folder = zip.folder(collection.name);
      await addToArchive(folder, collection.documentStructure);
    }
  }
  return archiveToPath(zip);
}
