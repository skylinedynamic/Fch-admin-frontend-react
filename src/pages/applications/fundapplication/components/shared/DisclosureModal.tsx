import React, { useRef, useState, useEffect } from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from 'reactstrap';
import './disclosure-modal.css';

interface DisclosureModalProps {
  isOpen: boolean;
  toggle: () => void;
  title: string;
  content: string;
}

export default function DisclosureModal({ isOpen, toggle, title, content }: DisclosureModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    }
  };

  useEffect(() => {
    if (!isOpen) setScrollProgress(0);
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      size="lg"
      centered
      scrollable
      className="zoomIn"
      contentClassName="legal-modal"
    >
      <div className="legal-modal-header">
        <div className="d-flex align-items-center gap-3">
          <div className="header-icon-container">
            <i className="ri-shield-check-line fs-22"></i>
          </div>
          <div>
            <p className="modal-subtitle mb-1">Legal Disclosure</p>
            <h5 className="modal-title mb-0">{title}</h5>
          </div>
        </div>
        <button type="button" className="legal-modal-close" onClick={toggle} aria-label="Close">
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="progress-container w-100" style={{ height: '4px', background: '#f1f5f9' }}>
        <div
          className="progress-bar"
          style={{
            width: `${scrollProgress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3182ce 0%, #63b3ed 100%)',
            transition: 'width 0.15s ease-out'
          }}
        />
      </div>

      <ModalBody className="p-0" innerRef={scrollRef} onScroll={handleScroll}>
        <div className="legal-doc" dangerouslySetInnerHTML={{ __html: content }} />
      </ModalBody>

      <ModalFooter className="border-top-0">
        <button className="btn btn-primary" onClick={toggle}>
          I Understand & Agree
        </button>
      </ModalFooter>
    </Modal>
  );
}
