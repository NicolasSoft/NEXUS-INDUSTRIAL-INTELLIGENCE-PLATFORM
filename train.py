import numpy as np
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler

# ===== DADOS SIMULADOS NORMAIS =====
samples = 1000
temperature = np.random.normal(70, 3, samples)
vibration = np.random.normal(0.02, 0.005, samples)
rpm = np.random.normal(1500, 50, samples)

X = np.column_stack((temperature, vibration, rpm))

scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

# ===== AUTOENCODER =====
input_dim = X_scaled.shape[1]
input_layer = Input(shape=(input_dim,))
encoded = Dense(8, activation="relu")(input_layer)
encoded = Dense(4, activation="relu")(encoded)
decoded = Dense(8, activation="relu")(encoded)
output = Dense(input_dim, activation="sigmoid")(decoded)

autoencoder = Model(inputs=input_layer, outputs=output)
autoencoder.compile(optimizer=Adam(0.001), loss="mse")

autoencoder.fit(X_scaled, X_scaled, epochs=30, batch_size=32, verbose=1)

autoencoder.save("ml/autoencoder.h5")
print("✅ Modelo treinado e salvo")
