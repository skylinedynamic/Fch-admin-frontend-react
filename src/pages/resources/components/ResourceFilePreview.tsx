import React, { useEffect, useState } from 'react';
import { useResourceFile } from '../../../modules/resource/queries';
import { fileExtension, PDF_EXTENSION } from '../../../config/fileTypeConfig';

interface ResourceFilePreviewProps {
  resourceId: number | string;
  title: string;
  fileUrl: string;
}

const Message: React.FC<{ title: string }> = ({ title }) => (
  <div className="d-flex align-items-center justify-content-center h-100">
    <div className="text-center">
      <p className="fw-bold fs-15 text-dark mb-1">{title}</p>
      <p className="text-muted fs-13 mb-0">Click Download to save this file to your device.</p>
    </div>
  </div>
);

/**
 * Shows a resource's PDF (R3-BUG-003). The file is private: its signed link
 * can't be framed (the API sends frame-ancestors 'self'), so the file is read
 * through the API and shown from a local blob: link, released on close.
 * Other kinds of file are offered for download only.
 */
const ResourceFilePreview: React.FC<ResourceFilePreviewProps> = ({ resourceId, title, fileUrl }) => {
  const isPdf = fileExtension(fileUrl) === PDF_EXTENSION;
  const { data: file, isError } = useResourceFile(resourceId, isPdf);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
      setSrc(null);
    };
  }, [file]);

  if (!isPdf) return <Message title="Preview Not Available" />;
  if (isError) return <Message title="The preview could not be loaded." />;

  if (!src) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-muted">Loading preview...</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={`${src}#toolbar=0&navpanes=0&scrollbar=1`}
      title={title}
      className="border-0 shadow-sm bg-white pdf-iframe"
    />
  );
};

export default ResourceFilePreview;
