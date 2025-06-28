// components/CryptoStatus.js
export const CryptoStatus = () => {
  const { matrixClient } = useMatrixClient();

  if (!window.Olm) {
    return (
      <div className="crypto-error">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        <span>Encryption unavailable - WASM failed to load</span>
      </div>
    );
  }

  return (
    <div className={`crypto-status ${matrixClient?.isCryptoEnabled?.() ? 'enabled' : 'disabled'}`}>
      <FontAwesomeIcon icon={matrixClient?.isCryptoEnabled?.() ? faLock : faUnlock} />
      <span>
        {matrixClient?.isCryptoEnabled?.() 
          ? 'End-to-end encryption enabled' 
          : 'Encryption not available'}
      </span>
    </div>
  );
};