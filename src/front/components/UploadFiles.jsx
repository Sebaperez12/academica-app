import React, { useEffect, useState } from "react";

const UploadFiles = ({ onUpload, setUploading }) => {
  const preset_name = "ml_default";
  const cloud_name = "dxvdismgz";

  const [loading, setLoading] = useState(false);

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setUploading(true);

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", preset_name);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/raw/upload`,
        {
          method: "POST",
          body: data,
        }
      );

      const result = await response.json();
      onUpload(result.secure_url);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="form-label">Archivo adjunto (opcional)</label>
      <input
        type="file"
        className="form-control"
        onChange={uploadFile}
      />
      {loading && <small>Subiendo archivo...</small>}
    </div>
  );
};

export default UploadFiles;
