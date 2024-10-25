import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';
import { Audio } from 'expo-av';

interface Pokemon {
  name: string;
  image: string;
  type: string;
  id: number;
  number: string;
  cry: string | null;
  description: string;
}

const Pokedex: React.FC = () => {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const fetchPokemon = async (pageNum: number) => {
    setLoading(true);
    const limit = 20;
    const offset = (pageNum - 1) * limit;

    const promises: Promise<Pokemon>[] = [];

    for (let i = offset + 1; i <= offset + limit && i <= 151; i++) {
      const url = `https://pokeapi.co/api/v2/pokemon/${i}`;
      promises.push(
        fetch(url)
          .then((res) => res.json())
          .then((pokemonData) =>
            fetch(`https://pokeapi.co/api/v2/pokemon-species/${i}`)
              .then((res) => res.json())
              .then((speciesData) => {
                // Determine the display name and audio name
                let displayName = pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1);
                let audioName = pokemonData.name.toLowerCase();
                
                // Update for Nidoran♂ and Nidoran♀
                if (pokemonData.name === 'nidoran-m') {
                  displayName = 'Nidoran♂';
                  audioName = 'nidoranm';
                } else if (pokemonData.name === 'nidoran-f') {
                  displayName = 'Nidoran♀';
                  audioName = 'nidoranf';
                }

                return {
                  name: displayName,
                  image: pokemonData["sprites"]["versions"]["generation-v"]["black-white"]["animated"]["front_default"],
                  type: pokemonData.types
                    .map((type: any) =>
                      type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)
                    )
                    .join(' / '),
                  id: pokemonData.id,
                  number: pokemonData.id.toString(),
                  cry: `https://play.pokemonshowdown.com/audio/cries/${audioName}.mp3`,
                  description:
                    speciesData.flavor_text_entries[4]?.flavor_text.replace(/\f/g, ' ') || 'Pokémon data unavailable.',
                };
              })
          )
      );
    }

    const newPokemon = await Promise.all(promises);
    setPokemon((prevPokemon) => [...prevPokemon, ...newPokemon]);
    setLoading(false);

    if (offset + limit >= 151) {
      setHasMore(false);
    }
  };

  const searchPokemonByName = async (name: string) => {
    setLoading(true);
    try {
      const url = `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`;
      const pokemonData = await fetch(url).then((res) => res.json());
      const speciesData = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonData.id}`).then((res) =>
        res.json()
      );

      // Determine the display name and audio name for searched Pokémon
      let displayName = pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1);
      let audioName = pokemonData.name.toLowerCase();

      // Update for Nidoran♂ and Nidoran♀
      if (pokemonData.name === 'nidoran-m') {
        displayName = 'Nidoran♂';
        audioName = 'nidoranm';
      } else if (pokemonData.name === 'nidoran-f') {
        displayName = 'Nidoran♀';
        audioName = 'nidoranf';
      }

      const searchedPokemon: Pokemon = {
        name: displayName,
        image: pokemonData["sprites"]["versions"]["generation-v"]["black-white"]["animated"]["front_default"],
        type: pokemonData.types
          .map((type: any) => type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1))
          .join(' / '),
        id: pokemonData.id,
        number: pokemonData.id.toString(),
        cry: `https://play.pokemonshowdown.com/audio/cries/${audioName}.mp3`,
        description:
          speciesData.flavor_text_entries[4]?.flavor_text.replace(/\f/g, ' ') || 'Pokémon data unavailable.',
      };

      setPokemon([searchedPokemon]);
    } catch (error) {
      setPokemon([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchText.trim() === '') {
      fetchPokemon(page);
    }
  }, [page, searchText]);

  const loadMorePokemon = () => {
    if (!loading && hasMore && searchText.trim() === '') {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const playCry = async (cryUrl: string | null) => {
    if (cryUrl) {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: cryUrl });
      setSound(newSound);
      await newSound.playAsync();
    } else {
      console.warn('No URL provided for playing sound');
    }
  };

  const renderPokemon = ({ item }: { item: Pokemon }) => (
    <TouchableOpacity style={styles.card} onPress={() => playCry(item.cry)}>
      <Svg height="100%" width="100%" style={styles.zigzag}>
        <Polygon
          points="0,0 255,0 235,50 255,100 235,150 255,200, 0,200"
          fill="#FF5722"
        />
      </Svg>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.cardNumber}># {item.number}</Text>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardType}>Type: {item.type}</Text>
          <Text numberOfLines={5} style={styles.descriptionText}>{item.description}</Text>
        </View>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.image} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return <ActivityIndicator size="large" color="#0000ff" />;
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      searchPokemonByName(searchText.trim());
    } else {
      resetPokedex();
    }
  };

  const resetPokedex = () => {
    setPokemon([]);
    setPage(1);
    setHasMore(true);
    setSearchText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Pokémon by name"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        {searchText ? (
          <TouchableOpacity onPress={resetPokedex} style={styles.clearButton}>
            <Ionicons name="close-circle" size={24} color="gray" />
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={pokemon}
        renderItem={renderPokemon}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={loadMorePokemon}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: 'lightblue',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  clearButton: {
    position: 'absolute',
    right: 20,
  },
  card: {
    marginVertical: 10,
    borderRadius: 10,
    elevation: 2,
    overflow: 'hidden',
    backgroundColor: '#FFCC80',
    position: 'relative',
  },
  content: {
    padding: 10,
    flexDirection: 'row',
    position: 'relative',
    zIndex: 1,
  },
  imageContainer: {
    width: '30%',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    backgroundColor: 'lightblue',
    marginTop: 20,
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#FF5722',
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  cardType: {
    fontSize: 16,
    marginBottom: 10,
    color: 'white',
  },
  descriptionText: {
    fontSize: 12,
    color: 'white',
    fontStyle: 'italic',
  },
  zigzag: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
});

export default Pokedex;
