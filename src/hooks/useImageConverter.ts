import { useRef, useState } from "react";
import type { ImageSpec } from "@/lib/imageSpecs";
import { validateImageFile } from "@/lib/utils";

interface ConverterState {
  file: File;
  spec: ImageSpec;
  onAccept: (f: File) => void;
}

export function useImageConverter() {
  const [converterState, setConverterState] = useState<ConverterState | null>(null);

  function triggerConverter(
    file: File,
    spec: ImageSpec,
    onValid: (f: File) => void,
    inputRef?: React.RefObject<HTMLInputElement>
  ) {
    const err = validateImageFile(file, spec);
    if (!err) {
      onValid(file);
      return;
    }
    setConverterState({
      file,
      spec,
      onAccept: (converted: File) => {
        setConverterState(null);
        onValid(converted);
      },
    });
  }

  function cancelConverter(inputRef?: React.RefObject<HTMLInputElement>) {
    if (inputRef?.current) inputRef.current.value = "";
    setConverterState(null);
  }

  return { converterState, triggerConverter, cancelConverter, setConverterState };
}
