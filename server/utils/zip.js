// @flow
import fs from "fs";
import * as Sentry from "@sentry/node";
import JSZip from "jszip";
import tmp from "tmp";
import { Attachment, Collection, Document } from "../models";
import { presentCollection } from "../presenters";
import { getImageByKey } from "./s3";

async function addToArchive(zip, documents, parentDocument) {
  for (const [index, doc] of documents.entries()) {
    const document = await Document.findByPk(doc.id);
    let text = document.toMarkdown();

    text = text.split("\n").splice(2).join("\n");

    const metadata = {
      position: index,
      category: `'${parentDocument ? parentDocument.title : ""}'`,
      title: `'${doc.title}'`,
    };
    const data = Object.keys(metadata).map((key) => `${key}: ${metadata[key]}`);
    text = ["---", ...data, "---", "\n"].join("\n");

    const attachments = await Attachment.findAll({
      where: { documentId: document.id },
    });

    for (const attachment of attachments) {
      await addImageToArchive(zip, attachment.key);
      text = text.replace(attachment.redirectUrl, encodeURI(attachment.key));
    }

    zip.file(`${document.title || "Untitled"}.md`, text);

    if (doc.children && doc.children.length) {
      const folder = zip.folder(document.title);
      await addToArchive(folder, doc.children, doc);
    }
  }
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
