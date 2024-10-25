import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons'; // For the X (clear) icon

// Define types for the API data
interface Pokemon {
  name: string;
  image: string;
  shinyImage: string;
  type: string;
  id: number;
  number: string;
  cry: string | null;
  flavorText: string;
}

const Pokedex: React.FC = () => {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]); // State for Pokémon
  const [loading, setLoading] = useState<boolean>(false); // Loading indicator
  const [page, setPage] = useState<number>(1); // Tracks which page we are on
  const [hasMore, setHasMore] = useState<boolean>(true); // Determines if there are more Pokémon to load
  const [searchText, setSearchText] = useState<string>(''); // State for the search text
  const [isSearching, setIsSearching] = useState<boolean>(false); // To handle search mode

  const fetchPokemon = async (pageNum: number) => {
    setLoading(true); // Start loading
    const limit = 10; // Fetch 10 Pokémon at a time
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
              .then((speciesData) => ({
                name: pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1),
                image: pokemonData.sprites.front_default,
                shinyImage: pokemonData.sprites.front_shiny,
                type: pokemonData.types
                  .map((type: any) =>
                    type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)
                  )
                  .join(' / '),
                id: pokemonData.id,
                number: pokemonData.id.toString(),
                cry: pokemonData.cry?.latest || null, // Adjusted this to handle null
                flavorText:
                  speciesData.flavor_text_entries[1]?.flavor_text.replace(/\f/g, ' ') || 'Pokémon data unavailable.',
              }))
          )
      );
    }

    const newPokemon = await Promise.all(promises);
    setPokemon((prevPokemon) => [...prevPokemon, ...newPokemon]); // Append new Pokémon to the existing list
    setLoading(false); // Stop loading

    if (offset + limit >= 151) {
      setHasMore(false); // No more Pokémon to load
    }
  };

  const searchPokemonByName = async (name: string) => {
    setLoading(true);
    setIsSearching(true); // Enter search mode
    try {
      const url = `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`;
      const pokemonData = await fetch(url).then((res) => res.json());
      const speciesData = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonData.id}`).then((res) =>
        res.json()
      );

      const searchedPokemon: Pokemon = {
        name: pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1),
        image: pokemonData.sprites.front_default,
        shinyImage: pokemonData.sprites.front_shiny,
        type: pokemonData.types
          .map((type: any) => type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1))
          .join(' / '),
        id: pokemonData.id,
        number: pokemonData.id.toString(),
        cry: pokemonData.cry?.latest || null,
        flavorText:
          speciesData.flavor_text_entries[28]?.flavor_text.replace(/\f/g, ' ') || 'Pokémon data unavailable.',
      };

      setPokemon([searchedPokemon]); // Show only the searched Pokémon
    } catch (error) {
      setPokemon([]); // If no Pokémon found, clear the list
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearching) {
      fetchPokemon(page); // Initial fetch of the first 10 Pokémon when not in search mode
    }
  }, [page, isSearching]);

  const loadMorePokemon = () => {
    if (!loading && hasMore && !isSearching) {
      setPage((prevPage) => prevPage + 1); // Increment the page number to load more Pokémon
    }
  };

  const playCry = async (cryUrl: string | null) => {
    if (cryUrl) {
      const { sound } = await Audio.Sound.createAsync({ uri: cryUrl });
      await sound.playAsync();
    }
  };

  const renderPokemon = ({ item }: { item: Pokemon }) => (
    <TouchableOpacity style={styles.card} onPress={() => playCry(item.cry)}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <Image source={{ uri: item.shinyImage }} style={styles.image} />
      </View>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardSubtitle}>#{item.number}</Text>
      <Text style={styles.cardType}>Type: {item.type}</Text>
      <Text style={styles.flavorText}>{item.flavorText}</Text>
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
      setIsSearching(false);
      setPage(1); // Reset page for the original list
      setPokemon([]); // Clear current Pokémon
    }
  };

  const clearSearch = () => {
    setSearchText('');
    setIsSearching(false);
    setPage(1); // Reset the page for the default Pokémon list
    setPokemon([]); // Clear the current list
    fetchPokemon(1); // Reload the first 10 Pokémon
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
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={24} color="gray" />
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={pokemon}
        renderItem={renderPokemon}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={loadMorePokemon} // Load more when the end of the list is reached
        onEndReachedThreshold={0.5} // Adjust this to trigger the fetch before hitting the bottom
        ListFooterComponent={renderFooter} // Show loading spinner when loading more Pokémon
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
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
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  image: {
    width: 100,
    height: 100,
    margin: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  cardSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  cardType: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    color: 'gray',
  },
  flavorText: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default Pokedex;
